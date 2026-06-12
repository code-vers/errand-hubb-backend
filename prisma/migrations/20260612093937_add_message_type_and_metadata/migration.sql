-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'text';
