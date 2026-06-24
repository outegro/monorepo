import { describe, expect, it, vi } from "vitest";
import { EntitlementsService } from "./entitlements.service";

describe("EntitlementsService.getRoles", () => {
  it("maps live grants to `service:role` strings and filters by expiry", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { service: "itmaxxing", role: "pro" },
      { service: "expense", role: "basic" },
    ]);
    const svc = new EntitlementsService({ entitlement: { findMany } } as never);

    expect(await svc.getRoles("u1")).toEqual(["itmaxxing:pro", "expense:basic"]);
    const arg = findMany.mock.calls[0]?.[0] as { where: { userId: string; OR: unknown } };
    const where = arg.where;
    expect(where.userId).toBe("u1");
    // expired grants are excluded (expiresAt null OR in the future)
    expect(where.OR).toEqual([{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }]);
  });

  it("returns an empty list when the user has no grants", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const svc = new EntitlementsService({ entitlement: { findMany } } as never);
    expect(await svc.getRoles("u1")).toEqual([]);
  });
});
