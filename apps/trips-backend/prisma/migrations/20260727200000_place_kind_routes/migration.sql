-- A place can be a ROUTE (hiking trail, market street) rather than a SPOT. The point of the
-- distinction: for a route, places.lat/lng is the TRAILHEAD — the thing you navigate to —
-- while the summit or far end lives in waypoints. Kakao returns 제비봉 (peak) and
-- 제비봉탐방지원센터 (visitor centre at the bottom) as separate POIs, and deep-linking to the
-- peak would route you to a mountaintop with no road.


-- CreateEnum
CREATE TYPE "place_kind" AS ENUM ('SPOT', 'ROUTE');

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "distance_km" DOUBLE PRECISION,
ADD COLUMN     "duration_min" INTEGER,
ADD COLUMN     "kind" "place_kind" NOT NULL DEFAULT 'SPOT',
ADD COLUMN     "waypoints" JSONB;

