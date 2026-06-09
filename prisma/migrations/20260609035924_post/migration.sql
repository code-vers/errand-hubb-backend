-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "assigned_to_id" TEXT,
ADD COLUMN     "service_type" TEXT,
ADD COLUMN     "time" TEXT;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
