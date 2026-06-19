-- CreateEnum
CREATE TYPE "TaglineJobStatus" AS ENUM ('pending', 'done', 'failed');

-- CreateTable
CREATE TABLE "tagline_jobs" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "TaglineJobStatus" NOT NULL DEFAULT 'pending',
    "taglines" TEXT[],
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tagline_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tagline_jobs_status_idx" ON "tagline_jobs"("status");
