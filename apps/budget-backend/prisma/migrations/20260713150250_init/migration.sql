-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'GEL', 'RUB', 'EUR');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('planned', 'paid');

-- CreateTable
CREATE TABLE "settings" (
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "base_expenses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "category" TEXT,
    "group" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_cumulative" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "base_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "base_incomes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "base_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "months" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "starting_balance" DECIMAL(14,4) NOT NULL,
    "notes" TEXT,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "month_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "category" TEXT,
    "group" TEXT,
    "is_base" BOOLEAN NOT NULL DEFAULT false,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'planned',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incomes" (
    "id" UUID NOT NULL,
    "month_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "is_base" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "month_cumulative_spends" (
    "id" UUID NOT NULL,
    "month_id" UUID NOT NULL,
    "base_expense_id" UUID NOT NULL,
    "spent" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "month_cumulative_spends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "base_expenses_user_id_idx" ON "base_expenses"("user_id");

-- CreateIndex
CREATE INDEX "base_incomes_user_id_idx" ON "base_incomes"("user_id");

-- CreateIndex
CREATE INDEX "months_user_id_year_month_idx" ON "months"("user_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "months_user_id_year_month_key" ON "months"("user_id", "year", "month");

-- CreateIndex
CREATE INDEX "expenses_month_id_idx" ON "expenses"("month_id");

-- CreateIndex
CREATE INDEX "incomes_month_id_idx" ON "incomes"("month_id");

-- CreateIndex
CREATE INDEX "month_cumulative_spends_month_id_idx" ON "month_cumulative_spends"("month_id");

-- CreateIndex
CREATE UNIQUE INDEX "month_cumulative_spends_month_id_base_expense_id_key" ON "month_cumulative_spends"("month_id", "base_expense_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_month_id_fkey" FOREIGN KEY ("month_id") REFERENCES "months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_month_id_fkey" FOREIGN KEY ("month_id") REFERENCES "months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "month_cumulative_spends" ADD CONSTRAINT "month_cumulative_spends_month_id_fkey" FOREIGN KEY ("month_id") REFERENCES "months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "month_cumulative_spends" ADD CONSTRAINT "month_cumulative_spends_base_expense_id_fkey" FOREIGN KEY ("base_expense_id") REFERENCES "base_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
