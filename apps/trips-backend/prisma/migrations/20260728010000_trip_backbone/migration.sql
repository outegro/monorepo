-- The trip itself: a team, its days, the timed items on each day, and votes on the ones that
-- are alternatives. The itinerary is authored outside the app and imported; this schema exists
-- to show it on a phone, let a team pick between options, and hang saved reel places off it.


-- CreateEnum
CREATE TYPE "trip_role" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "base_name" TEXT,
    "base_address" TEXT,
    "base_lat" DOUBLE PRECISION,
    "base_lng" DOUBLE PRECISION,
    "invite_code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_members" (
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT,
    "role" "trip_role" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_members_pkey" PRIMARY KEY ("trip_id","user_id")
);

-- CreateTable
CREATE TABLE "trip_days" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT,
    "city" TEXT,

    CONSTRAINT "trip_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_items" (
    "id" UUID NOT NULL,
    "day_id" UUID NOT NULL,
    "starts_at" TEXT,
    "ends_at" TEXT,
    "title" TEXT NOT NULL,
    "title_kr" TEXT,
    "details" TEXT,
    "address" TEXT,
    "address_kr" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "cost" TEXT,
    "booking_url" TEXT,
    "option_group" TEXT,
    "option_label" TEXT,
    "chosen" BOOLEAN NOT NULL DEFAULT false,
    "place_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "item_id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("item_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trips_invite_code_key" ON "trips"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "trip_days_trip_id_date_key" ON "trip_days"("trip_id", "date");

-- CreateIndex
CREATE INDEX "trip_items_day_id_position_idx" ON "trip_items"("day_id", "position");

-- CreateIndex
CREATE INDEX "trip_items_option_group_idx" ON "trip_items"("option_group");

-- CreateIndex
CREATE INDEX "votes_trip_id_user_id_idx" ON "votes"("trip_id", "user_id");

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_days" ADD CONSTRAINT "trip_days_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_items" ADD CONSTRAINT "trip_items_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "trip_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_items" ADD CONSTRAINT "trip_items_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "trip_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_trip_id_user_id_fkey" FOREIGN KEY ("trip_id", "user_id") REFERENCES "trip_members"("trip_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

