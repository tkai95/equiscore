-- CreateEnum
CREATE TYPE "internal_admin_invitation_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateTable
CREATE TABLE "internal_admin_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "internal_admin_role" NOT NULL DEFAULT 'readonly',
    "status" "internal_admin_invitation_status" NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "invited_by_id" TEXT,
    "accepted_by_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internal_admin_invitations_token_key" ON "internal_admin_invitations"("token");

-- CreateIndex
CREATE INDEX "internal_admin_invitations_email_status_idx" ON "internal_admin_invitations"("email", "status");

-- CreateIndex
CREATE INDEX "internal_admin_invitations_status_expires_at_idx" ON "internal_admin_invitations"("status", "expires_at");

-- AddForeignKey
ALTER TABLE "internal_admin_invitations" ADD CONSTRAINT "internal_admin_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_admin_invitations" ADD CONSTRAINT "internal_admin_invitations_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
