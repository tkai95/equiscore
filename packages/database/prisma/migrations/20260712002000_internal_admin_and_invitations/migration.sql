-- CreateEnum
CREATE TYPE "organisation_invitation_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "internal_admin_role" AS ENUM ('owner', 'admin', 'support', 'billing', 'compliance', 'readonly');

-- CreateEnum
CREATE TYPE "internal_admin_status" AS ENUM ('active', 'suspended', 'revoked');

-- CreateTable
CREATE TABLE "organisation_invitations" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "organisation_member_role" NOT NULL DEFAULT 'reviewer',
    "status" "organisation_invitation_status" NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "invited_by_id" TEXT,
    "accepted_by_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_admin_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "internal_admin_role" NOT NULL DEFAULT 'readonly',
    "status" "internal_admin_status" NOT NULL DEFAULT 'active',
    "granted_by_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_admin_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_admin_audit_events" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_email" TEXT,
    "actor_role" "internal_admin_role",
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "organisation_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_admin_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisation_invitations_token_key" ON "organisation_invitations"("token");

-- CreateIndex
CREATE INDEX "organisation_invitations_email_status_idx" ON "organisation_invitations"("email", "status");

-- CreateIndex
CREATE INDEX "organisation_invitations_organisation_id_status_idx" ON "organisation_invitations"("organisation_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "internal_admin_access_user_id_key" ON "internal_admin_access"("user_id");

-- CreateIndex
CREATE INDEX "internal_admin_access_status_role_idx" ON "internal_admin_access"("status", "role");

-- CreateIndex
CREATE INDEX "internal_admin_audit_events_created_at_idx" ON "internal_admin_audit_events"("created_at");

-- CreateIndex
CREATE INDEX "internal_admin_audit_events_organisation_id_created_at_idx" ON "internal_admin_audit_events"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "internal_admin_audit_events_actor_user_id_created_at_idx" ON "internal_admin_audit_events"("actor_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "organisation_invitations" ADD CONSTRAINT "organisation_invitations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_invitations" ADD CONSTRAINT "organisation_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_invitations" ADD CONSTRAINT "organisation_invitations_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_admin_access" ADD CONSTRAINT "internal_admin_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_admin_access" ADD CONSTRAINT "internal_admin_access_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_admin_audit_events" ADD CONSTRAINT "internal_admin_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_admin_audit_events" ADD CONSTRAINT "internal_admin_audit_events_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
