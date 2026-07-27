-- A place no longer carries a day of its own. Scheduling happens by attaching it to a TripDay
-- (trip_items.place_id); keeping a second, independent "which day" on the place itself would
-- drift the moment either side was edited, and the trip side is the one that has the times.


-- DropIndex
DROP INDEX "places_user_id_day_idx";

-- AlterTable
ALTER TABLE "places" DROP COLUMN "day",
DROP COLUMN "order_in_day";

