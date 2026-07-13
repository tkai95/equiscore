-- CreateEnum
CREATE TYPE "consumer_goal_type" AS ENUM ('rental', 'banking_access', 'utilities_phone', 'future_credit', 'income_proof', 'stronger_profile');

-- CreateEnum
CREATE TYPE "consumer_goal_status" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "consumer_goal_application_mode" AS ENUM ('alone', 'joint', 'unknown');

-- CreateTable
CREATE TABLE "consumer_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "consumer_goal_type" NOT NULL DEFAULT 'rental',
    "status" "consumer_goal_status" NOT NULL DEFAULT 'active',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "target_monthly_rent" DOUBLE PRECISION,
    "move_date" TIMESTAMP(3),
    "application_mode" "consumer_goal_application_mode",
    "deposit_available" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consumer_goals_user_id_type_key" ON "consumer_goals"("user_id", "type");

-- CreateIndex
CREATE INDEX "consumer_goals_user_id_status_idx" ON "consumer_goals"("user_id", "status");

-- CreateIndex
CREATE INDEX "consumer_goals_user_id_is_primary_idx" ON "consumer_goals"("user_id", "is_primary");

-- AddForeignKey
ALTER TABLE "consumer_goals" ADD CONSTRAINT "consumer_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
