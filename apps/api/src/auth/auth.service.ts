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
    const primary = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id
    )
    return primary?.email_address ?? data.email_addresses[0]?.email_address ?? ''
  }

  async syncUser(clerkId: string, email: string | undefined) {
    const resolvedEmail = email || (await this.fetchEmailFromClerk(clerkId))
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
}
