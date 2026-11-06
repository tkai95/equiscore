// ─── Local auth bypass: stand-in for `@clerk/nextjs` ─────────────────────────
// next.config.mjs aliases `@clerk/nextjs` to this file ONLY under `next dev`
// with APP_ENV=local. It is never part of a production build. See
// docs/ARCHITECTURE.md §4.
//
// Everything is a module-level constant so references stay stable across
// renders (components list `getToken` in effect/query dependencies).
import type { ReactNode } from 'react'

// Must match LOCAL_AUTH_TOKEN in apps/api/src/common/utils/local-auth.ts.
const LOCAL_AUTH_TOKEN = 'local-auth-bypass'
const LOCAL_USER_ID = 'local_dev_user'
const LOCAL_USER_EMAIL = 'local@equiscore.test'

type ChildrenProps = { children?: ReactNode }

const notAvailable = async (): Promise<never> => {
  throw new Error('Not available with the local auth bypass (APP_ENV=local)')
}

const signOut = async (arg?: (() => unknown) | { redirectUrl?: string }): Promise<void> => {
  if (typeof arg === 'function') {
    await arg()
    return
  }
  window.location.assign(arg?.redirectUrl ?? '/')
}

const getToken = async (): Promise<string> => LOCAL_AUTH_TOKEN

const authState = {
  isLoaded: true,
  isSignedIn: true,
  userId: LOCAL_USER_ID,
  sessionId: 'local_dev_session',
  getToken,
  signOut,
}

const primaryEmailAddress = { id: 'local_dev_email', emailAddress: LOCAL_USER_EMAIL }

const user = {
  id: LOCAL_USER_ID,
  firstName: 'Local',
  lastName: 'Developer',
  fullName: 'Local Developer',
  imageUrl: '',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  primaryEmailAddress,
  emailAddresses: [primaryEmailAddress],
  externalAccounts: [],
  passwordEnabled: false,
  twoFactorEnabled: false,
  update: notAvailable,
  updatePassword: notAvailable,
  createExternalAccount: notAvailable,
  delete: notAvailable,
}

const userState = { isLoaded: true, isSignedIn: true, user }
const clerkState = { signOut, client: { activeSessions: [] } }

export const useAuth = () => authState
export const useUser = () => userState
export const useClerk = () => clerkState

export function ClerkProvider({ children }: ChildrenProps) {
  return <>{children}</>
}

export function SignedIn({ children }: ChildrenProps) {
  return <>{children}</>
}

export function SignedOut(_props: ChildrenProps) {
  return null
}

export function SignOutButton({ children }: ChildrenProps) {
  return <>{children}</>
}

function LocalAuthNotice() {
  return (
    <p>
      Local auth bypass is on, so you are already signed in as {LOCAL_USER_EMAIL}.{' '}
      <a href="/dashboard">Go to the dashboard</a>
    </p>
  )
}

export const SignIn = (_props: Record<string, unknown>) => <LocalAuthNotice />
export const SignUp = (_props: Record<string, unknown>) => <LocalAuthNotice />

export function UserButton(_props: ChildrenProps & Record<string, unknown>) {
  return <span title={LOCAL_USER_EMAIL}>Local</span>
}
UserButton.MenuItems = (_props: ChildrenProps) => null
UserButton.Link = (_props: Record<string, unknown>) => null
UserButton.Action = (_props: Record<string, unknown>) => null
