-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "reel_status" AS ENUM ('PENDING', 'EXTRACTED', 'NEEDS_REVIEW', 'CONFIRMED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "reels" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "shortcode" TEXT NOT NULL,
    "note" TEXT,
    "status" "reel_status" NOT NULL DEFAULT 'PENDING',
    "extracted" JSONB,
    "candidates" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reel_id" UUID NOT NULL,
    "kakao_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_group" TEXT,
    "category_name" TEXT,
    "address" TEXT,
    "road_address" TEXT,
    "phone" TEXT,
    "kakao_url" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "price_note" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "day" INTEGER,
    "order_in_day" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reels_user_id_status_idx" ON "reels"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reels_user_id_shortcode_key" ON "reels"("user_id", "shortcode");

-- CreateIndex
CREATE UNIQUE INDEX "places_reel_id_key" ON "places"("reel_id");

-- CreateIndex
CREATE INDEX "places_user_id_day_idx" ON "places"("user_id", "day");

-- CreateIndex
CREATE INDEX "places_user_id_category_group_idx" ON "places"("user_id", "category_group");

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

