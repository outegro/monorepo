import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type AuthenticationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { Env } from "../config/env.validation";
import { RedisService } from "../redis/redis.service";
import { UsersRepository } from "../users/users.repository";
import { type PasskeyRecord, PasskeysRepository } from "./passkeys.repository";

const CHALLENGE_TTL = 300; // seconds

/**
 * Passkey (WebAuthn) ceremonies via @simplewebauthn. RP_ID is the registrable domain so
 * a credential works across *.outegro.com; the ceremony origin is the id-web BFF. The
 * one-time challenge lives in Redis (never trust a client-echoed challenge).
 */
@Injectable()
export class PasskeysService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly redis: RedisService,
    private readonly repo: PasskeysRepository,
    private readonly users: UsersRepository,
  ) {}

  private get rpID() {
    return this.config.get("WEBAUTHN_RP_ID", { infer: true });
  }
  private get rpOrigin() {
    return this.config.get("WEBAUTHN_RP_ORIGIN", { infer: true });
  }

  list(userId: string): Promise<PasskeyRecord[]> {
    return this.repo.listByUser(userId);
  }

  async deletePasskey(userId: string, id: string): Promise<void> {
    const deleted = await this.repo.deleteForUser(userId, id);
    if (deleted === 0) {
      throw new BadRequestException({ code: "passkey_not_found" });
    }
  }

  async registrationOptions(userId: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException({ code: "user_not_found" });
    }
    const existing = await this.repo.forExclude(userId);
    const options = await generateRegistrationOptions({
      rpName: this.config.get("WEBAUTHN_RP_NAME", { infer: true }),
      rpID: this.rpID,
      userName: user.email,
      userID: new TextEncoder().encode(userId),
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: c.transports as AuthenticatorTransportLike[],
      })),
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    });
    await this.redis.set(this.regKey(userId), options.challenge, "EX", CHALLENGE_TTL);
    return options;
  }

  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    name: string | undefined,
  ): Promise<void> {
    const expectedChallenge = await this.redis.get(this.regKey(userId));
    if (!expectedChallenge) {
      throw new BadRequestException({ code: "challenge_expired" });
    }
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.rpOrigin,
      expectedRPID: this.rpID,
      requireUserVerification: false,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException({ code: "registration_failed" });
    }
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await this.repo.create({
      userId,
      credentialId: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: name ?? null,
    });
    await this.redis.del(this.regKey(userId));
  }

  async authenticationOptions(): Promise<{
    challengeId: string;
    options: PublicKeyCredentialRequestOptionsJSON;
  }> {
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: "preferred",
      allowCredentials: [], // discoverable credentials (passkey autofill)
    });
    const challengeId = randomBytes(16).toString("hex");
    await this.redis.set(this.authKey(challengeId), options.challenge, "EX", CHALLENGE_TTL);
    return { challengeId, options };
  }

  /** Verify an authentication ceremony → return the owning userId (caller mints the session). */
  async verifyAuthentication(
    challengeId: string,
    response: AuthenticationResponseJSON,
  ): Promise<string> {
    const expectedChallenge = await this.redis.get(this.authKey(challengeId));
    if (!expectedChallenge) {
      throw new BadRequestException({ code: "challenge_expired" });
    }
    await this.redis.del(this.authKey(challengeId));

    const cred = await this.repo.findByCredentialId(response.id);
    if (!cred) {
      throw new UnauthorizedException({ code: "credential_unknown" });
    }
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.rpOrigin,
      expectedRPID: this.rpID,
      credential: {
        id: cred.credentialId,
        publicKey: cred.publicKey,
        counter: cred.counter,
        transports: cred.transports as AuthenticatorTransportLike[],
      },
      requireUserVerification: false,
    });
    if (!verification.verified) {
      throw new UnauthorizedException({ code: "authentication_failed" });
    }
    await this.repo.updateCounter(cred.id, verification.authenticationInfo.newCounter);
    return cred.userId;
  }

  private regKey(userId: string) {
    return `webauthn:reg:${userId}`;
  }
  private authKey(challengeId: string) {
    return `webauthn:auth:${challengeId}`;
  }
}

/** simplewebauthn's transport union; our DB stores them as plain strings. */
type AuthenticatorTransportLike =
  | "ble"
  | "cable"
  | "hybrid"
  | "internal"
  | "nfc"
  | "smart-card"
  | "usb";
