import { Injectable, ConflictException } from '@nestjs/common'
import { db } from '@equiscore/database'

@Injectable()
export class AuthService {
  /**
   * Upserts a user record from a verified Clerk JWT.
   * Called on first authenticated request to sync the Clerk identity into our DB.
   */
  async syncUser(clerkId: string, email: string | undefined) {
    if (!email) {
      const existing = await db.user.findUnique({
        where: { authProviderId: clerkId },
        include: { profile: true },
      })
      if (existing) return existing
      throw new Error('email claim missing from JWT — add it to the Clerk JWT template')
    }
    return db.user.upsert({
      where: { authProviderId: clerkId },
      update: { email },
      create: {
        authProviderId: clerkId,
        email,
        profile: {
          create: {
            profileStage: 'created',
          },
        },
      },
      include: { profile: true },
    })
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
