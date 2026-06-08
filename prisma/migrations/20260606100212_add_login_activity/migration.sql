-- CreateTable
CREATE TABLE "login_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "os" TEXT,
    "ip_address" TEXT,
    "location" TEXT,
    "device_icon" TEXT NOT NULL DEFAULT 'globe',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_activities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "login_activities" ADD CONSTRAINT "login_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
