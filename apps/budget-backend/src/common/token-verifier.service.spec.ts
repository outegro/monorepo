import { beforeEach, describe, expect, it, vi } from "vitest";

// Vitest hoists vi.mock() above imports; the factory may only close over outer
// variables prefixed "mock" (its hoisting convention), hence mockJwtVerify below.
const mockJwtVerify = vi.fn();
vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue("jwks-fn"),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

import { TokenVerifierService } from "./token-verifier.service";

function makeConfig() {
  return {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        JWKS_URL: "http://auth-backend:80/.well-known/jwks.json",
        JWT_ISSUER: "https://id.outegro.com",
        JWT_AUDIENCE: "outegro",
      };
      return values[key];
    }),
  } as never;
}

describe("TokenVerifierService", () => {
  beforeEach(() => {
    mockJwtVerify.mockReset();
  });

  it("returns the principal from a valid token's claims", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "user-1", sid: "session-1", roles: ["budget:pro"] },
    });
    const svc = new TokenVerifierService(makeConfig());
    const user = await svc.verify("valid.token");
    expect(user).toEqual({ userId: "user-1", sessionId: "session-1", roles: ["budget:pro"] });
  });

  it("defaults roles to an empty array when the claim is absent", async () => {
    mockJwtVerify.mockResolvedValue({ payload: { sub: "user-1", sid: "session-1" } });
    const svc = new TokenVerifierService(makeConfig());
    const user = await svc.verify("valid.token");
    expect(user?.roles).toEqual([]);
  });

  it("rejects a token missing sub or sid", async () => {
    mockJwtVerify.mockResolvedValue({ payload: { sid: "session-1" } });
    const svc = new TokenVerifierService(makeConfig());
    expect(await svc.verify("token-without-sub")).toBeNull();
  });

  it("returns null instead of throwing on an invalid signature", async () => {
    mockJwtVerify.mockRejectedValue(new Error("signature verification failed"));
    const svc = new TokenVerifierService(makeConfig());
    expect(await svc.verify("garbage")).toBeNull();
  });
});
