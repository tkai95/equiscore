-- CreateEnum
CREATE TYPE "counterparty_role" AS ENUM ('own_account', 'joint_household_account', 'credit_card', 'loan', 'rent_provider', 'employer', 'person_other', 'unknown');

-- CreateEnum
CREATE TYPE "resolution_source" AS ENUM ('machine_inferred', 'user_confirmed');

-- CreateTable
CREATE TABLE "counterparty_resolutions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "counterparty_key" TEXT NOT NULL,
    "role" "counterparty_role" NOT NULL,
    "source" "resolution_source" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "stream_key" TEXT,
    "evidence" JSONB,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counterparty_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "counterparty_resolutions_user_id_counterparty_key_key" ON "counterparty_resolutions"("user_id", "counterparty_key");

-- AddForeignKey
ALTER TABLE "counterparty_resolutions" ADD CONSTRAINT "counterparty_resolutions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "organisation_shared_profiles_organisation_id_shared_profile_id_" RENAME TO "organisation_shared_profiles_organisation_id_shared_profile_key";
