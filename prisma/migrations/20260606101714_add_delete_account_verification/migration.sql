-- AlterTable
ALTER TABLE "users" ADD COLUMN     "delete_account_expires" TIMESTAMP(3),
ADD COLUMN     "delete_account_token" TEXT;
