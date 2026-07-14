-- CreateEnum
CREATE TYPE "consumer_goal_priority" AS ENUM ('high', 'normal', 'low');

-- AlterTable
ALTER TABLE "consumer_goals"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "priority" "consumer_goal_priority" NOT NULL DEFAULT 'normal',
  ADD COLUMN "target_date" TIMESTAMP(3),
  ADD COLUMN "target_amount" DOUBLE PRECISION,
  ADD COLUMN "current_amount" DOUBLE PRECISION,
  ADD COLUMN "monthly_contribution" DOUBLE PRECISION,
  ADD COLUMN "reserved_funds" DOUBLE PRECISION,
  ADD COLUMN "assumptions" JSONB,
  ADD COLUMN "completed_at" TIMESTAMP(3);

-- Backfill title from the previous display label so existing goals keep their names.
UPDATE "consumer_goals"
SET "title" = COALESCE("title", "label")
WHERE "title" IS NULL AND "label" IS NOT NULL;

-- Drop one-goal-per-template constraint so users can create multiple instances of the same template.
DROP INDEX IF EXISTS "consumer_goals_user_id_type_key";

-- CreateIndex
CREATE INDEX "consumer_goals_user_id_type_status_idx" ON "consumer_goals"("user_id", "type", "status");

-- CreateIndex
CREATE INDEX "consumer_goals_user_id_updated_at_idx" ON "consumer_goals"("user_id", "updated_at");
