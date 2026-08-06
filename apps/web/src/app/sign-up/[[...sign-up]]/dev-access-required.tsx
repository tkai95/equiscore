import Link from 'next/link'
import { Lock } from 'lucide-react'
import { EquiScoreLogo } from '@/components/brand/logo'

// Shown on the dev site when someone tries to sign up without a valid invite.
// Mirrors the admin "access required" screen.
export function DevAccessRequired({ reason }: { reason?: string }) {
  const reasonCopy =
    reason === 'expired'
      ? 'This invite link has expired. Ask for a new one.'
      : reason === 'accepted'
        ? 'This invite has already been used.'
        : reason === 'revoked'
          ? 'This invite has been revoked.'
          : 'The dev site is invite-only. You need a valid invite link to create a profile.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <EquiScoreLogo width={150} />
        </div>

        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Lock className="h-6 w-6 text-gray-500" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Dev access required
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">{reasonCopy}</p>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
            If you already have an account, sign in. Otherwise request an invite from the EquiScore
            team.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Sign in
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
