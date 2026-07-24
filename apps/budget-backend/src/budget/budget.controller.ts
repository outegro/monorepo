import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { LiveSyncInterceptor } from "../live/live-sync.interceptor";
import {
  type CreateBaseExpenseInput,
  type CreateBaseIncomeInput,
  type CreateExpenseInput,
  type CreateIncomeInput,
  type CreateMonthInput,
  createBaseExpenseSchema,
  createBaseIncomeSchema,
  createExpenseSchema,
  createIncomeSchema,
  createMonthSchema,
  type SetCumulativeSpendInput,
  setCumulativeSpendSchema,
  type UpdateBaseExpenseInput,
  type UpdateBaseIncomeInput,
  type UpdateExpenseInput,
  type UpdateIncomeInput,
  type UpdateMonthInput,
  type UpdateSettingsInput,
  updateBaseExpenseSchema,
  updateBaseIncomeSchema,
  updateExpenseSchema,
  updateIncomeSchema,
  updateMonthSchema,
  updateSettingsSchema,
} from "./budget.contracts";
import { BudgetService } from "./budget.service";

@Controller()
@UseGuards(JwtAuthGuard)
@UseInterceptors(LiveSyncInterceptor)
export class BudgetController {
  constructor(private readonly budget: BudgetService) {}

  // ───── Months ─────

  @Get("months")
  listMonths(@CurrentUser() user: AuthUser) {
    return this.budget.deriveMonthsChain(user.userId);
  }

  @Get("months/:id")
  getMonth(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.budget.getMonthDerived(user.userId, id);
  }

  @Post("months")
  createMonths(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createMonthSchema)) body: CreateMonthInput,
  ) {
    return this.budget.createMonths(user.userId, body);
  }

  @Patch("months/:id")
  updateMonth(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMonthSchema)) body: UpdateMonthInput,
  ) {
    return this.budget.updateMonth(user.userId, id, body);
  }

  @Delete("months/:id")
  deleteMonth(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.budget.deleteMonth(user.userId, id);
  }

  // ───── Expenses ─────

  @Post("months/:id/expenses")
  createExpense(
    @CurrentUser() user: AuthUser,
    @Param("id") monthId: string,
    @Body(new ZodValidationPipe(createExpenseSchema)) body: CreateExpenseInput,
  ) {
    return this.budget.createExpense(user.userId, monthId, body);
  }

  @Patch("expenses/:id")
  updateExpense(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateExpenseSchema)) body: UpdateExpenseInput,
  ) {
    return this.budget.updateExpense(user.userId, id, body);
  }

  @Delete("expenses/:id")
  deleteExpense(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.budget.deleteExpense(user.userId, id);
  }

  // ───── Incomes ─────

  @Post("months/:id/incomes")
  createIncome(
    @CurrentUser() user: AuthUser,
    @Param("id") monthId: string,
    @Body(new ZodValidationPipe(createIncomeSchema)) body: CreateIncomeInput,
  ) {
    return this.budget.createIncome(user.userId, monthId, body);
  }

  @Patch("incomes/:id")
  updateIncome(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateIncomeSchema)) body: UpdateIncomeInput,
  ) {
    return this.budget.updateIncome(user.userId, id, body);
  }

  @Delete("incomes/:id")
  deleteIncome(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.budget.deleteIncome(user.userId, id);
  }

  // ───── Cumulative caps ─────

  @Put("months/:id/cumulative")
  setCumulativeSpend(
    @CurrentUser() user: AuthUser,
    @Param("id") monthId: string,
    @Body(new ZodValidationPipe(setCumulativeSpendSchema)) body: SetCumulativeSpendInput,
  ) {
    return this.budget.setCumulativeSpend(user.userId, monthId, body);
  }

  // ───── Base templates ─────

  @Get("base/expenses")
  listBaseExpenses(@CurrentUser() user: AuthUser) {
    return this.budget.listBaseExpenses(user.userId);
  }

  @Post("base/expenses")
  createBaseExpense(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBaseExpenseSchema)) body: CreateBaseExpenseInput,
  ) {
    return this.budget.createBaseExpense(user.userId, body);
  }

  @Patch("base/expenses/:id")
  updateBaseExpense(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateBaseExpenseSchema)) body: UpdateBaseExpenseInput,
  ) {
    return this.budget.updateBaseExpense(user.userId, id, body);
  }

  @Delete("base/expenses/:id")
  deleteBaseExpense(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.budget.deleteBaseExpense(user.userId, id);
  }

  @Get("base/incomes")
  listBaseIncomes(@CurrentUser() user: AuthUser) {
    return this.budget.listBaseIncomes(user.userId);
  }

  @Post("base/incomes")
  createBaseIncome(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBaseIncomeSchema)) body: CreateBaseIncomeInput,
  ) {
    return this.budget.createBaseIncome(user.userId, body);
  }

  @Patch("base/incomes/:id")
  updateBaseIncome(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateBaseIncomeSchema)) body: UpdateBaseIncomeInput,
  ) {
    return this.budget.updateBaseIncome(user.userId, id, body);
  }

  @Delete("base/incomes/:id")
  deleteBaseIncome(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.budget.deleteBaseIncome(user.userId, id);
  }

  // ───── Settings + FX ─────

  @Get("settings")
  async getSettings(@CurrentUser() user: AuthUser) {
    return { initialBalance: await this.budget.loadInitialBalance(user.userId) };
  }

  @Patch("settings")
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateSettingsSchema)) body: UpdateSettingsInput,
  ) {
    return this.budget.updateSettings(user.userId, body);
  }

  @Get("fx")
  getFx() {
    return this.budget.getFxState();
  }

  @Post("fx/refresh")
  refreshFx() {
    return this.budget.refreshFx();
  }
}
