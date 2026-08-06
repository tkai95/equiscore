import { cookies } from 'next/headers'
import { SignUp } from '@clerk/nextjs'
import { isInvitationSite } from '@/lib/site'
import { API_URL } from '@/lib/api-base'
import { SignUpWithEmail } from './sign-up-with-email'
import { DevAccessRequired } from './dev-access-required'

// Validates a dev-invite token against the API. Returns the invite shape or
// null if invalid/expired/missing. Public endpoint (no auth).
async function validateInvite(token: string): Promise<{
  status: string
  email?: string
} | null> {
  try {
    const res = await fetch(
      `${API_URL}/auth/dev-invite?token=${encodeURIComponent(token)}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    return (await res.json()) as { status: string; email?: string }
  } catch {
    return null
  }
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: { email?: string; invite?: string }
}) {
  const email = typeof searchParams.email === 'string' ? searchParams.email : ''

  // On the invitation site (dev), sign-up is gated behind a valid invite token.
  if (isInvitationSite) {
    const inviteToken =
      typeof searchParams.invite === 'string'
        ? searchParams.invite
        : cookies().get('dev_invite_token')?.value

    if (!inviteToken) {
      return <DevAccessRequired />
    }

    const invite = await validateInvite(inviteToken)
    if (!invite || invite.status !== 'pending') {
      // Clear any stale cookie and show the access-required screen.
      cookies().delete('dev_invite_token')
      return <DevAccessRequired reason={invite?.status ?? 'invalid'} />
    }

    // Stash the token so Clerk's multi-step sign-up (which navigates between
    // sub-routes under /sign-up) keeps the invite context, then pre-fill the
    // invited email.
    cookies().set('dev_invite_token', inviteToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days — matches invite expiry
      path: '/',
    })
    const prefillEmail = email || invite.email || ''
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        {prefillEmail ? (
          <SignUpWithEmail email={prefillEmail} />
        ) : (
          <SignUp signInUrl="/sign-in" />
        )}
      </div>
    )
  }

  // Open + public sites: unrestricted sign-up.
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      {email ? <SignUpWithEmail email={email} /> : <SignUp signInUrl="/sign-in" />}
    </div>
  )
}
