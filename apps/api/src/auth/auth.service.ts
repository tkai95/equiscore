import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { db } from '@equiscore/database'

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  private async fetchEmailFromClerk(clerkId: string): Promise<string> {
    const secretKey = this.config.get<string>('CLERK_SECRET_KEY') ?? ''
    const res = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    if (!res.ok) throw new Error(`Clerk user lookup failed: ${res.statusText}`)
    const data = (await res.json()) as {
      email_addresses: Array<{ email_address: string; id: string }>
      primary_email_address_id: string
    }
    const primary = data.email_addresses.find((e) => e.id === data.primary_email_address_id)
    return primary?.email_address ?? data.email_addresses[0]?.email_address ?? ''
  }

  async syncUser(clerkId: string, email: string | undefined) {
    const resolvedEmail = (email || (await this.fetchEmailFromClerk(clerkId))).trim().toLowerCase()

    // A user may already exist with this email under a DIFFERENT authProviderId
    // — most commonly when the same email signs in from two Clerk instances
    // (e.g. dev and prod) that share a database. The naive upsert-by-clerkId
    // would try to create a second row and hit the email unique constraint.
    // Resolve that first: if a row exists for this email, re-link it to the
    // current clerkId (the identity is the same person).
    const existingByEmail = await db.user.findUnique({ where: { email: resolvedEmail } })
    if (existingByEmail && existingByEmail.authProviderId !== clerkId) {
      const relinked = await db.user.update({
        where: { id: existingByEmail.id },
        data: { authProviderId: clerkId },
        include: { profile: true },
      })
      if (!relinked.profile) {
        await db.userProfile.create({ data: { userId: relinked.id, profileStage: 'created' } })
      }
      return relinked
    }

    const user = await db.user.upsert({
      where: { authProviderId: clerkId },
      update: { email: resolvedEmail },
      create: {
        authProviderId: clerkId,
        email: resolvedEmail,
        profile: {
          create: {
            profileStage: 'created',
          },
        },
      },
      include: { profile: true },
    })

    // Guard: ensure profile row exists for pre-existing users that were created
    // before the profile nested-create was in place.
    if (!user.profile) {
      await db.userProfile.create({
        data: { userId: user.id, profileStage: 'created' },
      })
    }

    return user
  }

  async getMe(clerkId: string) {
    return db.user.findUnique({
      where: { authProviderId: clerkId },
      include: {
        profile: true,
        _count: {
          select: {
            bankConnections: true,
            documents: true,
            trustScores: true,
          },
        },
      },
    })
  }

  // ─── Dev site access gating ──────────────────────────────────────────────

  /**
   * Validate a dev-access sign-up invite token. Called by the (unauthenticated)
   * dev /sign-up page before the user has an account. Returns the invite's
   * email + expiry if valid; throws 404/409 otherwise. Past-due pending
   * invites are expired first.
   */
  async validateDevInvite(token: string) {
    await db.devAccessInvite.updateMany({
      where: { status: 'pending', expiresAt: { lte: new Date() } },
      data: { status: 'expired' },
    })
    const invitation = await db.devAccessInvite.findUnique({ where: { token } })
    if (!invitation) return null
    if (invitation.status !== 'pending') return { status: invitation.status }
    if (invitation.expiresAt <= new Date()) {
      await db.devAccessInvite.update({ where: { id: invitation.id }, data: { status: 'expired' } })
      return { status: 'expired' }
    }
    return { status: 'pending', email: invitation.email, expiresAt: invitation.expiresAt }
  }

  /**
   * Does the current user have access to the dev site? Returns { hasAccess,
   * claimed }. On the first sign-in of an invited user, this claims their
   * pending invite (matched by email) and grants access. Authenticated only.
   */
  async checkDevAccess(clerkId: string, email: string | undefined) {
    const user = await db.user.findUnique({ where: { authProviderId: clerkId } })
    if (!user) return { hasAccess: false, claimed: false }

    const existing = await db.devAccess.findUnique({ where: { userId: user.id } })
    if (existing?.status === 'active') return { hasAccess: true, claimed: false }

    // First sign-in of an invited user: claim a matching pending invite by email.
    const resolvedEmail = (email ?? user.email).trim().toLowerCase()
    const invitation = await db.devAccessInvite.findFirst({
      where: { email: resolvedEmail, status: 'pending', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!invitation) return { hasAccess: false, claimed: false }

    await db.$transaction(async (tx) => {
      await tx.devAccess.upsert({
        where: { userId: user.id },
        update: { status: 'active', revokedAt: null, grantedById: invitation.invitedById },
        create: { userId: user.id, status: 'active', grantedById: invitation.invitedById },
      })
      await tx.devAccessInvite.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedById: user.id, acceptedAt: new Date() },
      })
    })
    return { hasAccess: true, claimed: true }
  }
}
