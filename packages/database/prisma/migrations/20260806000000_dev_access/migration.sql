-- CreateEnum
CREATE TYPE "dev_access_invite_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "dev_access_status" AS ENUM ('active', 'suspended', 'revoked');

-- CreateTable
CREATE TABLE "dev_access_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "dev_access_invite_status" NOT NULL DEFAULT 'pending',
    "invited_by_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_by_id" TEXT,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_access_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "dev_access_status" NOT NULL DEFAULT 'active',
    "granted_by_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dev_access_invites_token_key" ON "dev_access_invites"("token");

-- CreateIndex
CREATE INDEX "dev_access_invites_email_status_idx" ON "dev_access_invites"("email", "status");

-- CreateIndex
CREATE INDEX "dev_access_invites_status_expires_at_idx" ON "dev_access_invites"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "dev_access_user_id_key" ON "dev_access"("user_id");

-- CreateIndex
CREATE INDEX "dev_access_status_idx" ON "dev_access"("status");

-- AddForeignKey
ALTER TABLE "dev_access_invites" ADD CONSTRAINT "dev_access_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_access_invites" ADD CONSTRAINT "dev_access_invites_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_access" ADD CONSTRAINT "dev_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_access" ADD CONSTRAINT "dev_access_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
