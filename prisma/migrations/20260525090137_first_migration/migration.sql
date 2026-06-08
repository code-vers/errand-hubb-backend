-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'client', 'errand');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'deactivated', 'pending');

-- CreateEnum
CREATE TYPE "VisibilityStatus" AS ENUM ('public', 'private');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'client',
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "profile_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bio" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "location" TEXT,
    "time_zone" TEXT,
    "preferred_contact" TEXT,
    "total_earnings" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "jobs_completed" INTEGER NOT NULL DEFAULT 0,
    "visibility" "VisibilityStatus" NOT NULL DEFAULT 'public',
    "rate_per_hour" DECIMAL(10,2),
    "services" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
