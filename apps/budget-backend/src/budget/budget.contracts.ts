import { z } from "zod";

export const currencySchema = z.enum(["USD", "GEL", "RUB", "EUR"]);

export const createMonthSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  label: z.string().min(1).max(60).optional(),
  startingBalance: z.number().finite().optional(),
  useBaseExpenses: z.boolean().default(true),
  useBaseIncomes: z.boolean().default(true),
  notes: z.string().max(2000).optional(),
  /** How many sequential months to add starting from the computed slot. */
  count: z.number().int().min(1).max(36).default(1),
});
export type CreateMonthInput = z.infer<typeof createMonthSchema>;

export const updateMonthSchema = z.object({
  notes: z.string().max(2000).nullable().optional(),
  isClosed: z.boolean().optional(),
});
export type UpdateMonthInput = z.infer<typeof updateMonthSchema>;

export const createExpenseSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().finite(),
  currency: currencySchema,
  category: z.string().max(60).optional(),
  group: z.string().max(60).optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  amount: z.number().finite().optional(),
  currency: currencySchema.optional(),
  category: z.string().max(60).nullable().optional(),
  group: z.string().max(60).nullable().optional(),
  status: z.enum(["planned", "paid"]).optional(),
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const createIncomeSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().finite(),
  currency: currencySchema,
});
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;

export const updateIncomeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  amount: z.number().finite().optional(),
  currency: currencySchema.optional(),
});
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;

export const createBaseExpenseSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().finite(),
  currency: currencySchema,
  category: z.string().max(60).optional(),
  group: z.string().max(60).optional(),
  order: z.number().int().optional(),
  isCumulative: z.boolean().default(false),
});
export type CreateBaseExpenseInput = z.infer<typeof createBaseExpenseSchema>;

export const updateBaseExpenseSchema = createBaseExpenseSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateBaseExpenseInput = z.infer<typeof updateBaseExpenseSchema>;

export const createBaseIncomeSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().finite(),
  currency: currencySchema,
  order: z.number().int().optional(),
});
export type CreateBaseIncomeInput = z.infer<typeof createBaseIncomeSchema>;

export const updateBaseIncomeSchema = createBaseIncomeSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateBaseIncomeInput = z.infer<typeof updateBaseIncomeSchema>;

export const updateSettingsSchema = z.object({
  initialBalance: z.number().finite().optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const setCumulativeSpendSchema = z.object({
  baseExpenseId: z.string().min(1),
  spent: z.number().finite().min(0),
});
export type SetCumulativeSpendInput = z.infer<typeof setCumulativeSpendSchema>;
