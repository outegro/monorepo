import { Injectable, NotFoundException } from "@nestjs/common";
import { FxService } from "../fx/fx.service";
import type { Currency } from "../fx/fx.types";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateBaseExpenseInput,
  CreateBaseIncomeInput,
  CreateExpenseInput,
  CreateIncomeInput,
  CreateMonthInput,
  SetCumulativeSpendInput,
  UpdateBaseExpenseInput,
  UpdateBaseIncomeInput,
  UpdateExpenseInput,
  UpdateIncomeInput,
  UpdateMonthInput,
  UpdateSettingsInput,
} from "./budget.contracts";
import { computeMonthTotals, type MonthTotals } from "./budget.types";
import { BudgetNotifyPublisher } from "./budget-notify.publisher";

const INITIAL_BALANCE_KEY = "initial_balance";

export interface MonthWithItems {
  id: string;
  year: number;
  month: number;
  label: string;
  startingBalance: number; // derived from chain, not the stored snapshot
  notes: string | null;
  isClosed: boolean;
  expenses: LineItem[];
  incomes: LineItem[];
  cumulative: Array<{
    id: string | null;
    baseExpenseId: string;
    name: string;
    cap: number;
    spent: number;
    remaining: number;
  }>;
  totals: MonthTotals;
}

interface LineItem {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  category?: string | null;
  group?: string | null;
  isBase: boolean;
  status?: "planned" | "paid";
  order: number;
}

/**
 * Core budget domain logic — ported from the standalone "Finance Future" prototype,
 * made multi-tenant (every query scoped by userId; budget owns its own DB, no FK to
 * the auth service's users table — userId is just the JWT `sub`).
 */
@Injectable()
export class BudgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fx: FxService,
    private readonly notify: BudgetNotifyPublisher,
  ) {}

  // ───── Settings ─────

  async loadInitialBalance(userId: string): Promise<number> {
    const row = await this.prisma.setting.findUnique({
      where: { userId_key: { userId, key: INITIAL_BALANCE_KEY } },
    });
    return row ? Number(row.value) : 0;
  }

  async updateSettings(
    userId: string,
    input: UpdateSettingsInput,
  ): Promise<{ initialBalance: number }> {
    if (input.initialBalance !== undefined) {
      await this.prisma.setting.upsert({
        where: { userId_key: { userId, key: INITIAL_BALANCE_KEY } },
        create: { userId, key: INITIAL_BALANCE_KEY, value: String(input.initialBalance) },
        update: { value: String(input.initialBalance) },
      });
    }
    return { initialBalance: await this.loadInitialBalance(userId) };
  }

  async getFxState() {
    return this.fx.getState();
  }

  async refreshFx() {
    const entry = await this.fx.refresh();
    return { rates: entry.rates, fetchedAt: entry.fetchedAt, source: entry.source };
  }

  // ───── Derived month chain ─────

  /** Walks every month in order, deriving each one's starting balance from the previous. */
  async deriveMonthsChain(userId: string): Promise<MonthWithItems[]> {
    const rates = await this.fx.getRates();
    const months = await this.prisma.month.findMany({
      where: { userId },
      orderBy: [{ year: "asc" }, { month: "asc" }],
      include: {
        expenses: { orderBy: { order: "asc" } },
        incomes: { orderBy: { order: "asc" } },
        cumulativeSpend: true,
      },
    });
    const baseCaps = await this.prisma.baseExpense.findMany({
      where: { userId, isActive: true, isCumulative: true },
      orderBy: [{ group: "asc" }, { order: "asc" }],
    });

    let running = await this.loadInitialBalance(userId);
    const result: MonthWithItems[] = [];

    for (const m of months) {
      const expenses: LineItem[] = m.expenses.map((e) => ({
        id: e.id,
        name: e.name,
        amount: Number(e.amount),
        currency: e.currency,
        category: e.category,
        group: e.group,
        isBase: e.isBase,
        status: e.status,
        order: e.order,
      }));
      const incomes: LineItem[] = m.incomes.map((i) => ({
        id: i.id,
        name: i.name,
        amount: Number(i.amount),
        currency: i.currency,
        isBase: i.isBase,
        order: i.order,
      }));

      const spendByCapId = new Map(m.cumulativeSpend.map((cs) => [cs.baseExpenseId, cs]));
      const cumulative = baseCaps.map((cap) => {
        const cs = spendByCapId.get(cap.id);
        const capUsd = Number(cap.amount) * (rates[cap.currency] ?? 1);
        const spentUsd = cs ? Number(cs.spent) : 0;
        return {
          id: cs?.id ?? null,
          baseExpenseId: cap.id,
          name: cap.name,
          cap: capUsd,
          spent: spentUsd,
          remaining: capUsd - spentUsd,
        };
      });
      const cumulativeSpentTotal = cumulative.reduce((s, c) => s + c.spent, 0);

      const totals = computeMonthTotals(running, expenses, incomes, cumulativeSpentTotal, rates);

      result.push({
        id: m.id,
        year: m.year,
        month: m.month,
        label: m.label,
        startingBalance: running,
        notes: m.notes,
        isClosed: m.isClosed,
        expenses,
        incomes,
        cumulative,
        totals,
      });
      running = totals.endingBalanceUsd;
    }
    return result;
  }

  async getMonthDerived(userId: string, id: string): Promise<MonthWithItems> {
    const all = await this.deriveMonthsChain(userId);
    const found = all.find((m) => m.id === id);
    if (!found) throw new NotFoundException({ code: "month_not_found" });
    return found;
  }

  async getLastEndingBalance(userId: string): Promise<number> {
    const all = await this.deriveMonthsChain(userId);
    if (all.length === 0) return this.loadInitialBalance(userId);
    const last = all.at(-1);
    return last ? last.totals.endingBalanceUsd : this.loadInitialBalance(userId);
  }

  // ───── Months ─────

  async createMonths(userId: string, input: CreateMonthInput): Promise<{ created: string[] }> {
    const rates = await this.fx.getRates();

    let cursor: { year: number; month: number } | null = null;
    if (input.year != null && input.month != null) {
      cursor = { year: input.year, month: input.month };
    } else {
      const last = await this.prisma.month.findFirst({
        where: { userId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
      if (last) cursor = { year: last.year, month: last.month };
    }

    let runningBalance = await this.getLastEndingBalance(userId);
    const baseExpenses = input.useBaseExpenses
      ? await this.prisma.baseExpense.findMany({ where: { userId, isActive: true } })
      : [];
    const baseIncomes = input.useBaseIncomes
      ? await this.prisma.baseIncome.findMany({ where: { userId, isActive: true } })
      : [];

    const createdIds: string[] = [];

    for (let i = 0; i < input.count; i++) {
      const slot = nextSlot(cursor);
      cursor = { year: slot.year, month: slot.month };

      const startingBalance =
        i === 0 && input.startingBalance != null && input.startingBalance !== 0
          ? input.startingBalance
          : runningBalance;

      const created = await this.prisma.month.create({
        data: {
          userId,
          year: slot.year,
          month: slot.month,
          label: input.label ?? slot.label,
          startingBalance,
          notes: input.notes ?? null,
        },
      });

      for (const b of baseExpenses) {
        if (b.isCumulative) {
          await this.prisma.monthCumulativeSpend.create({
            data: { monthId: created.id, baseExpenseId: b.id, spent: 0 },
          });
        } else {
          await this.prisma.expense.create({
            data: {
              monthId: created.id,
              name: b.name,
              amount: b.amount,
              currency: b.currency,
              category: b.category,
              group: b.group,
              isBase: true,
              order: b.order,
            },
          });
        }
      }
      if (baseIncomes.length > 0) {
        await this.prisma.income.createMany({
          data: baseIncomes.map((b, idx) => ({
            monthId: created.id,
            name: b.name,
            amount: b.amount,
            currency: b.currency,
            isBase: true,
            order: b.order ?? idx,
          })),
        });
      }

      // Chain forward: compute this month's ending balance for the next iteration.
      const fresh = await this.prisma.month.findUniqueOrThrow({
        where: { id: created.id },
        include: { expenses: true, incomes: true, cumulativeSpend: true },
      });
      const cumulativeSpentTotal = fresh.cumulativeSpend.reduce((s, cs) => s + Number(cs.spent), 0);
      const totals = computeMonthTotals(
        startingBalance,
        fresh.expenses.map((e) => ({ amount: Number(e.amount), currency: e.currency })),
        fresh.incomes.map((inc) => ({ amount: Number(inc.amount), currency: inc.currency })),
        cumulativeSpentTotal,
        rates,
      );
      runningBalance = totals.endingBalanceUsd;
      createdIds.push(created.id);
    }

    return { created: createdIds };
  }

  private async assertMonthOwner(userId: string, id: string): Promise<void> {
    const month = await this.prisma.month.findFirst({ where: { id, userId } });
    if (!month) throw new NotFoundException({ code: "month_not_found" });
  }

  async updateMonth(userId: string, id: string, input: UpdateMonthInput): Promise<void> {
    await this.assertMonthOwner(userId, id);
    await this.prisma.month.update({
      where: { id },
      data: { notes: input.notes, isClosed: input.isClosed },
    });
  }

  async deleteMonth(userId: string, id: string): Promise<void> {
    await this.assertMonthOwner(userId, id);
    await this.prisma.month.delete({ where: { id } });
  }

  // ───── Expenses ─────

  async createExpense(
    userId: string,
    monthId: string,
    input: CreateExpenseInput,
  ): Promise<{ id: string }> {
    await this.assertMonthOwner(userId, monthId);
    const last = await this.prisma.expense.findFirst({
      where: { monthId },
      orderBy: { order: "desc" },
    });
    const created = await this.prisma.expense.create({
      data: { monthId, ...input, order: (last?.order ?? -1) + 1 },
    });
    return { id: created.id };
  }

  async updateExpense(userId: string, id: string, input: UpdateExpenseInput): Promise<void> {
    const owned = await this.prisma.expense.findFirst({ where: { id, month: { userId } } });
    if (!owned) throw new NotFoundException({ code: "expense_not_found" });
    await this.prisma.expense.update({ where: { id }, data: input });
  }

  async deleteExpense(userId: string, id: string): Promise<void> {
    const owned = await this.prisma.expense.findFirst({ where: { id, month: { userId } } });
    if (!owned) throw new NotFoundException({ code: "expense_not_found" });
    await this.prisma.expense.delete({ where: { id } });
  }

  // ───── Incomes ─────

  async createIncome(
    userId: string,
    monthId: string,
    input: CreateIncomeInput,
  ): Promise<{ id: string }> {
    await this.assertMonthOwner(userId, monthId);
    const last = await this.prisma.income.findFirst({
      where: { monthId },
      orderBy: { order: "desc" },
    });
    const created = await this.prisma.income.create({
      data: { monthId, ...input, order: (last?.order ?? -1) + 1 },
    });
    return { id: created.id };
  }

  async updateIncome(userId: string, id: string, input: UpdateIncomeInput): Promise<void> {
    const owned = await this.prisma.income.findFirst({ where: { id, month: { userId } } });
    if (!owned) throw new NotFoundException({ code: "income_not_found" });
    await this.prisma.income.update({ where: { id }, data: input });
  }

  async deleteIncome(userId: string, id: string): Promise<void> {
    const owned = await this.prisma.income.findFirst({ where: { id, month: { userId } } });
    if (!owned) throw new NotFoundException({ code: "income_not_found" });
    await this.prisma.income.delete({ where: { id } });
  }

  // ───── Cumulative caps ─────

  async setCumulativeSpend(
    userId: string,
    monthId: string,
    input: SetCumulativeSpendInput,
  ): Promise<void> {
    await this.assertMonthOwner(userId, monthId);
    const cap = await this.prisma.baseExpense.findFirst({
      where: { id: input.baseExpenseId, userId },
    });
    if (!cap) throw new NotFoundException({ code: "base_expense_not_found" });

    const existing = await this.prisma.monthCumulativeSpend.findUnique({
      where: { monthId_baseExpenseId: { monthId, baseExpenseId: input.baseExpenseId } },
    });
    await this.prisma.monthCumulativeSpend.upsert({
      where: { monthId_baseExpenseId: { monthId, baseExpenseId: input.baseExpenseId } },
      create: { monthId, baseExpenseId: input.baseExpenseId, spent: input.spent },
      update: { spent: input.spent },
    });

    // Alert only on the crossing edge (under → over), so repeated updates while already
    // over budget don't re-notify. Cap is stored in its own currency → convert to USD.
    const rates = await this.fx.getRates();
    const capUsd = Number(cap.amount) * (rates[cap.currency] ?? 1);
    const prevSpent = existing ? Number(existing.spent) : 0;
    if (capUsd > 0 && prevSpent <= capUsd && input.spent > capUsd) {
      void this.notify.alertCapExceeded(userId, cap.name, input.spent, capUsd);
    }
  }

  // ───── Base templates ─────

  listBaseExpenses(userId: string) {
    return this.prisma.baseExpense.findMany({
      where: { userId, isActive: true },
      orderBy: [{ group: "asc" }, { order: "asc" }],
    });
  }

  async createBaseExpense(userId: string, input: CreateBaseExpenseInput) {
    const last = await this.prisma.baseExpense.findFirst({
      where: { userId },
      orderBy: { order: "desc" },
    });
    return this.prisma.baseExpense.create({
      data: { userId, ...input, order: input.order ?? (last?.order ?? -1) + 1 },
    });
  }

  async updateBaseExpense(userId: string, id: string, input: UpdateBaseExpenseInput) {
    const owned = await this.prisma.baseExpense.findFirst({ where: { id, userId } });
    if (!owned) throw new NotFoundException({ code: "base_expense_not_found" });
    return this.prisma.baseExpense.update({ where: { id }, data: input });
  }

  async deleteBaseExpense(userId: string, id: string): Promise<void> {
    const owned = await this.prisma.baseExpense.findFirst({ where: { id, userId } });
    if (!owned) throw new NotFoundException({ code: "base_expense_not_found" });
    await this.prisma.baseExpense.delete({ where: { id } });
  }

  listBaseIncomes(userId: string) {
    return this.prisma.baseIncome.findMany({
      where: { userId, isActive: true },
      orderBy: { order: "asc" },
    });
  }

  async createBaseIncome(userId: string, input: CreateBaseIncomeInput) {
    const last = await this.prisma.baseIncome.findFirst({
      where: { userId },
      orderBy: { order: "desc" },
    });
    return this.prisma.baseIncome.create({
      data: { userId, ...input, order: input.order ?? (last?.order ?? -1) + 1 },
    });
  }

  async updateBaseIncome(userId: string, id: string, input: UpdateBaseIncomeInput) {
    const owned = await this.prisma.baseIncome.findFirst({ where: { id, userId } });
    if (!owned) throw new NotFoundException({ code: "base_income_not_found" });
    return this.prisma.baseIncome.update({ where: { id }, data: input });
  }

  async deleteBaseIncome(userId: string, id: string): Promise<void> {
    const owned = await this.prisma.baseIncome.findFirst({ where: { id, userId } });
    if (!owned) throw new NotFoundException({ code: "base_income_not_found" });
    await this.prisma.baseIncome.delete({ where: { id } });
  }
}

/**
 * Next sequential (year, month) slot after `from`, or the current month if this is
 * the first month ever created. Label defaults to an ISO "YYYY-MM" — locale-neutral,
 * since the platform now spans 5 UI languages; budget-web renders its own localized
 * label from year/month and only sends a custom `label` when the user renames it.
 */
function nextSlot(from: { year: number; month: number } | null): {
  year: number;
  month: number;
  label: string;
} {
  if (from) {
    const month = from.month === 12 ? 1 : from.month + 1;
    const year = from.month === 12 ? from.year + 1 : from.year;
    return { year, month, label: `${year}-${String(month).padStart(2, "0")}` };
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return { year, month, label: `${year}-${String(month).padStart(2, "0")}` };
}
