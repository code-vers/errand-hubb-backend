-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "deleted_for" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false;
