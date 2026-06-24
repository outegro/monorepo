import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { GoogleService } from "./google.service";

function build(clientId?: string) {
  const map: Record<string, string | undefined> = {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: "secret",
    GOOGLE_REDIRECT_URI: "https://id.outegro.com/api/auth/google/callback",
  };
  const config = { get: (k: string) => map[k] };
  const redis = { set: vi.fn(), getdel: vi.fn() };
  return { svc: new GoogleService(config as never, redis as never), redis };
}

describe("GoogleService.start", () => {
  it("builds the Google consent URL with PKCE + persists the state", async () => {
    const { svc, redis } = build("cid.apps.googleusercontent.com");
    const { url } = await svc.start();
    const u = new URL(url);
    expect(`${u.origin}${u.pathname}`).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(u.searchParams.get("client_id")).toBe("cid.apps.googleusercontent.com");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("redirect_uri")).toBe(
      "https://id.outegro.com/api/auth/google/callback",
    );
    const state = u.searchParams.get("state");
    expect(redis.set).toHaveBeenCalledWith(`google:oauth:${state}`, expect.any(String), "EX", 600);
  });

  it("stays dormant (503) when no client id is configured", async () => {
    const { svc } = build(undefined);
    await expect(svc.start()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
