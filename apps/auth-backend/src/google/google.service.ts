import { createHash, randomBytes } from "node:crypto";
import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "../config/env.validation";
import { RedisService } from "../redis/redis.service";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const STATE_TTL = 600; // seconds

export interface GoogleIdentity {
  googleSub: string;
  email: string;
  emailVerified: boolean;
  /** Set when this was a "link to existing account" flow (vs a fresh login). */
  linkUserId?: string;
}

/**
 * Google OIDC with PKCE. The one-time {verifier, linkUserId} lives in Redis keyed by
 * `state`; the id_token is verified against Google's JWKS (issuer + audience) and used
 * once to establish identity — we never store Google tokens, we mint our own session.
 */
@Injectable()
export class GoogleService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly redis: RedisService,
  ) {}

  private clientId(): string {
    const id = this.config.get("GOOGLE_CLIENT_ID", { infer: true });
    if (!id) {
      throw new ServiceUnavailableException({ code: "google_disabled" });
    }
    return id;
  }

  private get redirectUri(): string {
    return this.config.get("GOOGLE_REDIRECT_URI", { infer: true });
  }

  /** Build the consent-screen URL + persist the PKCE verifier (and optional link target). */
  async start(linkUserId?: string): Promise<{ url: string }> {
    const clientId = this.clientId();
    const state = randomBytes(16).toString("hex");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    await this.redis.set(
      this.key(state),
      JSON.stringify({ verifier, linkUserId }),
      "EX",
      STATE_TTL,
    );
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      access_type: "online",
      prompt: "select_account",
    });
    return { url: `${GOOGLE_AUTH_URL}?${params.toString()}` };
  }

  /** Exchange the code (with PKCE verifier) and verify the resulting id_token. */
  async exchangeAndVerify(code: string, state: string): Promise<GoogleIdentity> {
    const raw = await this.redis.getdel(this.key(state));
    if (!raw) {
      throw new UnauthorizedException({ code: "invalid_state" });
    }
    const { verifier, linkUserId } = JSON.parse(raw) as {
      verifier: string;
      linkUserId?: string;
    };

    const body = new URLSearchParams({
      code,
      client_id: this.clientId(),
      client_secret: this.config.get("GOOGLE_CLIENT_SECRET", { infer: true }) ?? "",
      redirect_uri: this.redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    });
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!tokenRes.ok) {
      throw new UnauthorizedException({ code: "google_exchange_failed" });
    }
    const tokens = (await tokenRes.json()) as { id_token?: string };
    if (!tokens.id_token) {
      throw new UnauthorizedException({ code: "google_no_id_token" });
    }

    const { payload } = await jwtVerify(tokens.id_token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: this.clientId(),
    });
    const googleSub = String(payload.sub ?? "");
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!googleSub || !email) {
      throw new UnauthorizedException({ code: "google_no_email" });
    }
    return { googleSub, email, emailVerified: payload.email_verified === true, linkUserId };
  }

  private key(state: string): string {
    return `google:oauth:${state}`;
  }
}
