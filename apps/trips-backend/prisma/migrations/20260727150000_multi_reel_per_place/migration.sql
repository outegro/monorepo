-- Many reels can describe the same place (two people sending three reels about one
-- restaurant is the normal case), so Place stops being owned by a single Reel: the FK moves
-- onto reels.place_id and places dedupe on (user_id, kakao_id). Also adds the yt-dlp caption
-- fields. Safe as a plain ALTER — the table is empty, the service shipped hours ago.


-- DropForeignKey
ALTER TABLE "places" DROP CONSTRAINT "places_reel_id_fkey";

-- DropIndex
DROP INDEX "places_reel_id_key";

-- AlterTable
ALTER TABLE "places" DROP COLUMN "reel_id";

-- AlterTable
ALTER TABLE "reels" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "place_id" UUID,
ADD COLUMN     "thumbnail" TEXT,
ADD COLUMN     "uploader" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "places_user_id_kakao_id_key" ON "places"("user_id", "kakao_id");

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

