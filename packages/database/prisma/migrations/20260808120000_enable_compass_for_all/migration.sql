-- Enable Compass (My Money) for all users at launch.
-- The column default flips to true, and existing rows are backfilled so
-- current users get Compass immediately (not just future sign-ups).
ALTER TABLE "users" ALTER COLUMN "compass_enabled" SET DEFAULT true;
UPDATE "users" SET "compass_enabled" = true WHERE "compass_enabled" = false;
