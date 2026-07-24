import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FX_RATES } from "../fx/fx.types";
import { BudgetService } from "./budget.service";

const CAP = { id: "cap-1", name: "Groceries", amount: 100, currency: "USD" as const };

function makeDeps({ existingSpent }: { existingSpent: number | null }) {
  const prisma = {
    month: { findFirst: vi.fn().mockResolvedValue({ id: "month-1" }) },
    baseExpense: { findFirst: vi.fn().mockResolvedValue(CAP) },
    monthCumulativeSpend: {
      findUnique: vi
        .fn()
        .mockResolvedValue(existingSpent === null ? null : { id: "cs-1", spent: existingSpent }),
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
  const fx = { getRates: vi.fn().mockResolvedValue(DEFAULT_FX_RATES) };
  const notify = { alertCapExceeded: vi.fn().mockResolvedValue(undefined) };
  return { prisma, fx, notify };
}

describe("BudgetService.setCumulativeSpend", () => {
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the month is not owned by the user", async () => {
    const { prisma, fx, notify } = makeDeps({ existingSpent: 0 });
    prisma.month.findFirst.mockResolvedValue(null);
    const svc = new BudgetService(prisma as never, fx as never, notify as never);
    await expect(
      svc.setCumulativeSpend("user-1", "month-1", { baseExpenseId: "cap-1", spent: 50 }),
    ).rejects.toThrow(NotFoundException);
  });

  it("alerts when spend crosses from under to over the cap", async () => {
    deps = makeDeps({ existingSpent: 80 });
    const svc = new BudgetService(deps.prisma as never, deps.fx as never, deps.notify as never);
    await svc.setCumulativeSpend("user-1", "month-1", { baseExpenseId: "cap-1", spent: 120 });
    expect(deps.notify.alertCapExceeded).toHaveBeenCalledWith("user-1", "Groceries", 120, 100);
  });

  it("does not re-alert when already over the cap on a repeated update", async () => {
    deps = makeDeps({ existingSpent: 150 });
    const svc = new BudgetService(deps.prisma as never, deps.fx as never, deps.notify as never);
    await svc.setCumulativeSpend("user-1", "month-1", { baseExpenseId: "cap-1", spent: 180 });
    expect(deps.notify.alertCapExceeded).not.toHaveBeenCalled();
  });

  it("does not alert while still under the cap", async () => {
    deps = makeDeps({ existingSpent: 10 });
    const svc = new BudgetService(deps.prisma as never, deps.fx as never, deps.notify as never);
    await svc.setCumulativeSpend("user-1", "month-1", { baseExpenseId: "cap-1", spent: 50 });
    expect(deps.notify.alertCapExceeded).not.toHaveBeenCalled();
  });

  it("does not alert on the very first entry when there is no prior spend recorded", async () => {
    deps = makeDeps({ existingSpent: null });
    const svc = new BudgetService(deps.prisma as never, deps.fx as never, deps.notify as never);
    await svc.setCumulativeSpend("user-1", "month-1", { baseExpenseId: "cap-1", spent: 30 });
    expect(deps.notify.alertCapExceeded).not.toHaveBeenCalled();
  });

  it("alerts immediately if the very first entry already exceeds the cap", async () => {
    deps = makeDeps({ existingSpent: null });
    const svc = new BudgetService(deps.prisma as never, deps.fx as never, deps.notify as never);
    await svc.setCumulativeSpend("user-1", "month-1", { baseExpenseId: "cap-1", spent: 150 });
    expect(deps.notify.alertCapExceeded).toHaveBeenCalledWith("user-1", "Groceries", 150, 100);
  });
});
