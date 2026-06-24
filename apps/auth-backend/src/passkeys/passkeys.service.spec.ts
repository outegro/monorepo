import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PasskeysService } from "./passkeys.service";

const config = {
  get: (k: string) =>
    ({
      WEBAUTHN_RP_ID: "outegro.com",
      WEBAUTHN_RP_ORIGIN: "https://id.outegro.com",
      WEBAUTHN_RP_NAME: "Outegro",
    })[k],
};

function build() {
  const redis = { set: vi.fn(), get: vi.fn(), del: vi.fn() };
  const repo = {
    forExclude: vi.fn().mockResolvedValue([]),
    deleteForUser: vi.fn(),
    listByUser: vi.fn(),
  };
  const users = { findById: vi.fn().mockResolvedValue({ id: "u1", email: "a@b.c" }) };
  const svc = new PasskeysService(config as never, redis as never, repo as never, users as never);
  return { svc, redis, repo, users };
}

describe("PasskeysService", () => {
  it("generates discoverable authentication options + stores the challenge", async () => {
    const { svc, redis } = build();
    const { challengeId, options } = await svc.authenticationOptions();
    expect(challengeId).toHaveLength(32);
    expect(options.challenge).toBeTruthy();
    expect(redis.set).toHaveBeenCalledWith(
      `webauthn:auth:${challengeId}`,
      options.challenge,
      "EX",
      300,
    );
  });

  it("generates registration options excluding existing credentials + stores the challenge", async () => {
    const { svc, repo, redis } = build();
    repo.forExclude.mockResolvedValue([{ credentialId: "abc", transports: ["internal"] }]);
    const options = await svc.registrationOptions("u1");
    expect(options.challenge).toBeTruthy();
    expect(options.excludeCredentials?.[0]?.id).toBe("abc");
    expect(redis.set).toHaveBeenCalledWith("webauthn:reg:u1", options.challenge, "EX", 300);
  });

  it("rejects deleting a passkey the user does not own", async () => {
    const { svc, repo } = build();
    repo.deleteForUser.mockResolvedValue(0);
    await expect(svc.deletePasskey("u1", "x")).rejects.toBeInstanceOf(BadRequestException);
  });
});
