import { createHash, randomBytes } from "node:crypto";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { calculateJwkThumbprint, exportJWK, importPKCS8, type JWK, SignJWT } from "jose";
import type { Env } from "../config/env.validation";
import { RedisService } from "../redis/redis.service";

export type RotateResult = "OK" | "REUSE" | "DEAD";

export interface AccessClaims {
  /** user id → JWT `sub` */
  userId: string;
  /** session id → JWT `sid` */
  sessionId: string;
  /** entitlement roles (`service:role`) */
  roles: string[];
}

/**
 * Atomic refresh rotation (single Redis round-trip, no race between concurrent
 * refreshes). `sessrt:<sid>` holds sha256 of the CURRENT refresh token AND doubles as
 * the session-liveness marker.
 *  - token not current (already rotated) → REUSE: the session is burned (stolen token).
 *  - key absent → DEAD: session revoked or TTL-expired.
 *  - match → rotate: store the new hash, old token instantly invalid.
 */
const ROTATE_LUA = `
local stored = redis.call('GET', KEYS[1])
if not stored then return 'DEAD' end
if stored ~= ARGV[1] then
  redis.call('DEL', KEYS[1])
  return 'REUSE'
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 'OK'
`;

type RotateCommand = (
  key: string,
  oldHash: string,
  newHash: string,
  ttl: number,
) => Promise<RotateResult>;

@Injectable()
export class TokensService implements OnModuleInit {
  private privateKey!: Awaited<ReturnType<typeof importPKCS8>>;
  private publicJwk!: JWK;
  private kid!: string;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.privateKey = await importPKCS8(
      this.config.get("JWT_PRIVATE_KEY", { infer: true }),
      "ES256",
    );
    const full = await exportJWK(this.privateKey);
    const pub: JWK = { kty: full.kty, crv: full.crv, x: full.x, y: full.y };
    this.kid = await calculateJwkThumbprint(pub);
    this.publicJwk = { ...pub, kid: this.kid, alg: "ES256", use: "sig" };
    this.redis.defineCommand("rotateRefresh", { numberOfKeys: 1, lua: ROTATE_LUA });
  }

  /** Public JWKS for subservices to verify access tokens (no shared secret). */
  jwks(): { keys: JWK[] } {
    return { keys: [this.publicJwk] };
  }

  async signAccessToken(claims: AccessClaims): Promise<string> {
    return new SignJWT({ sid: claims.sessionId, roles: claims.roles })
      .setProtectedHeader({ alg: "ES256", kid: this.kid })
      .setSubject(claims.userId)
      .setIssuer(this.config.get("JWT_ISSUER", { infer: true }))
      .setAudience(this.config.get("JWT_AUDIENCE", { infer: true }))
      .setIssuedAt()
      .setExpirationTime(`${this.config.get("ACCESS_TTL", { infer: true })}s`)
      .sign(this.privateKey);
  }

  /** Mint a fresh refresh token for a session and store its hash (becomes the liveness marker). */
  async issueRefresh(sessionId: string): Promise<string> {
    const token = this.mintToken(sessionId);
    await this.redis.set(
      this.key(sessionId),
      this.hash(token),
      "EX",
      this.config.get("REFRESH_TTL", { infer: true }),
    );
    return token;
  }

  /** Atomically rotate. On OK returns the new token; on REUSE the session is already burned. */
  async rotateRefresh(
    oldToken: string,
  ): Promise<{ result: RotateResult; token?: string; sessionId?: string }> {
    const sessionId = oldToken.split(".")[0];
    if (!sessionId) {
      return { result: "DEAD" };
    }
    const newToken = this.mintToken(sessionId);
    const rotate = (this.redis as unknown as { rotateRefresh: RotateCommand }).rotateRefresh.bind(
      this.redis,
    );
    const result = await rotate(
      this.key(sessionId),
      this.hash(oldToken),
      this.hash(newToken),
      this.config.get("REFRESH_TTL", { infer: true }),
    );
    return result === "OK" ? { result, token: newToken, sessionId } : { result, sessionId };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
  }

  async isSessionAlive(sessionId: string): Promise<boolean> {
    return (await this.redis.exists(this.key(sessionId))) === 1;
  }

  private key(sessionId: string): string {
    return `sessrt:${sessionId}`;
  }

  /** `<sid>.<random>` — sid prefix lets rotation find the key without storing the raw token. */
  private mintToken(sessionId: string): string {
    return `${sessionId}.${randomBytes(32).toString("base64url")}`;
  }

  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
