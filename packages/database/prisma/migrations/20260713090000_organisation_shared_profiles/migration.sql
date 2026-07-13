-- CreateEnum
CREATE TYPE "organisation_shared_profile_status" AS ENUM ('ready_to_assess', 'assessed', 'declined', 'expired', 'revoked');

-- CreateTable
CREATE TABLE "organisation_shared_profiles" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "shared_profile_id" TEXT NOT NULL,
    "imported_by_id" TEXT NOT NULL,
    "status" "organisation_shared_profile_status" NOT NULL DEFAULT 'ready_to_assess',
    "source" TEXT NOT NULL DEFAULT 'partner_import',
    "notes" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "assessed_at" TIMESTAMP(3),

    CONSTRAINT "organisation_shared_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisation_shared_profiles_organisation_id_shared_profile_id_key" ON "organisation_shared_profiles"("organisation_id", "shared_profile_id");

-- CreateIndex
CREATE INDEX "organisation_shared_profiles_organisation_id_status_idx" ON "organisation_shared_profiles"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "organisation_shared_profiles_shared_profile_id_idx" ON "organisation_shared_profiles"("shared_profile_id");

-- AddForeignKey
ALTER TABLE "organisation_shared_profiles" ADD CONSTRAINT "organisation_shared_profiles_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_shared_profiles" ADD CONSTRAINT "organisation_shared_profiles_shared_profile_id_fkey" FOREIGN KEY ("shared_profile_id") REFERENCES "shared_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_shared_profiles" ADD CONSTRAINT "organisation_shared_profiles_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
