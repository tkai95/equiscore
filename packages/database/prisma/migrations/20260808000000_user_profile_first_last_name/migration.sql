-- Add first_name and last_name columns to user_profiles.
-- Both nullable: existing rows keep their full_name; new onboarding writes
-- first_name/last_name and derives full_name from them for backcompat.
ALTER TABLE "user_profiles" ADD COLUMN "first_name" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "last_name" TEXT;
