-- CreateEnum
CREATE TYPE "LoreEntryType" AS ENUM ('role', 'project', 'achievement', 'skill', 'education', 'note');

-- CreateEnum
CREATE TYPE "GenerationKind" AS ENUM ('intake_review', 'structure', 'bullet', 'cover_letter', 'summary');

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "headline" TEXT,
    "target_role" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "lore_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "LoreEntryType" NOT NULL,
    "title" TEXT NOT NULL,
    "org" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "metrics" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lore_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "GenerationKind" NOT NULL,
    "input" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lore_entries_user_id_idx" ON "lore_entries"("user_id");

-- CreateIndex
CREATE INDEX "generations_user_id_kind_idx" ON "generations"("user_id", "kind");
