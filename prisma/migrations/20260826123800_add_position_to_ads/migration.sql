-- AlterTable
ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "position" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "youtube_links" TEXT[] DEFAULT ARRAY[]::TEXT[];
