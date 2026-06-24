import { createHash } from "node:crypto";
import { HttpException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const EMAIL = "user@example.com";

function build() {
  const tx = {};
  const prisma = { $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)) };
  const users = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
  };
  const codes = {
    create: vi.fn(),
    findActive: vi.fn(),
    incrementAttempts: vi.fn(),
    consume: vi.fn(),
  };
  const sessions = {
    create: vi.fn().mockResolvedValue({ id: "s1" }),
    findById: vi.fn(),
    listActive: vi.fn(),
    touch: vi.fn(),
    revoke: vi.fn(),
  };
  const entitlements = { getRoles: vi.fn().mockResolvedValue([]), list: vi.fn() };
  const tokens = {
    issueRefresh: vi.fn().mockResolvedValue("s1.refresh"),
    signAccessToken: vi.fn().mockResolvedValue("access"),
    rotateRefresh: vi.fn(),
    revokeSession: vi.fn(),
  };
  const outbox = { enqueue: vi.fn(), publish: vi.fn() };
  const config = { get: vi.fn().mockReturnValue(600) };
  const svc = new AuthService(
    prisma as never,
    users as never,
    codes as never,
    sessions as never,
    entitlements as never,
    tokens as never,
    outbox as never,
    config as never,
  );
  return { svc, prisma, users, codes, sessions, entitlements, tokens, outbox };
}

const verifiedUser = {
  id: "u1",
  email: EMAIL,
  emailVerified: true,
  locale: "ru",
  createdAt: new Date(),
};

describe("AuthService.requestCode", () => {
  it("creates a new user and emits user.created + login_code into the outbox", async () => {
    const { svc, users, codes, outbox } = build();
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue({ ...verifiedUser, emailVerified: false });

    await svc.requestCode(EMAIL);

    expect(users.create).toHaveBeenCalledWith(EMAIL, expect.anything());
    expect(codes.create).toHaveBeenCalled();
    expect(outbox.enqueue).toHaveBeenCalledTimes(2); // user.created + notify.requested
  });

  it("reuses an existing user (only emits the login_code)", async () => {
    const { svc, users, outbox } = build();
    users.findByEmail.mockResolvedValue(verifiedUser);

    await svc.requestCode(EMAIL);

    expect(users.create).not.toHaveBeenCalled();
    expect(outbox.enqueue).toHaveBeenCalledTimes(1);
  });
});

describe("AuthService.verifyCode", () => {
  it("rejects a wrong code and increments attempts", async () => {
    const { svc, users, codes } = build();
    users.findByEmail.mockResolvedValue(verifiedUser);
    codes.findActive.mockResolvedValue({ id: "c1", codeHash: sha256("111111"), attempts: 0 });

    await expect(svc.verifyCode(EMAIL, "222222", {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(codes.incrementAttempts).toHaveBeenCalledWith("c1");
  });

  it("rejects once the attempt cap is reached", async () => {
    const { svc, users, codes } = build();
    users.findByEmail.mockResolvedValue(verifiedUser);
    codes.findActive.mockResolvedValue({ id: "c1", codeHash: sha256("111111"), attempts: 5 });

    await expect(svc.verifyCode(EMAIL, "111111", {})).rejects.toBeInstanceOf(HttpException);
    expect(codes.consume).not.toHaveBeenCalled();
  });

  it("consumes the code, verifies the email and issues tokens on success", async () => {
    const { svc, users, codes } = build();
    users.findByEmail.mockResolvedValue({ ...verifiedUser, emailVerified: false });
    codes.findActive.mockResolvedValue({ id: "c1", codeHash: sha256("123456"), attempts: 0 });

    const res = await svc.verifyCode(EMAIL, "123456", {});

    expect(res).toEqual({ accessToken: "access", refreshToken: "s1.refresh", sessionId: "s1" });
    expect(codes.consume).toHaveBeenCalledWith("c1");
    expect(users.markEmailVerified).toHaveBeenCalledWith("u1");
  });
});

describe("AuthService.refresh", () => {
  it("returns 401 on a DEAD token", async () => {
    const { svc, tokens } = build();
    tokens.rotateRefresh.mockResolvedValue({ result: "DEAD" });
    await expect(svc.refresh("x.y", {})).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("burns the session and emits alerts on REUSE", async () => {
    const { svc, tokens, sessions, users } = build();
    tokens.rotateRefresh.mockResolvedValue({ result: "REUSE", sessionId: "s1" });
    sessions.findById.mockResolvedValue({ id: "s1", userId: "u1" });
    users.findById.mockResolvedValue(verifiedUser);

    await expect(svc.refresh("s1.y", {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.revoke).toHaveBeenCalledWith("s1", "reuse", expect.anything());
  });

  it("rotates and re-mints the access token on OK", async () => {
    const { svc, tokens, sessions } = build();
    tokens.rotateRefresh.mockResolvedValue({ result: "OK", token: "s1.new", sessionId: "s1" });
    sessions.findById.mockResolvedValue({ id: "s1", userId: "u1" });

    const res = await svc.refresh("s1.old", {});
    expect(res.refreshToken).toBe("s1.new");
    expect(res.accessToken).toBe("access");
  });
});
