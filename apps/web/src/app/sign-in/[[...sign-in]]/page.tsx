import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      {/* Behavioural safety fix: "Sign in means sign in."
          transferable={false} prevents Clerk's default sign-in-or-up flow from
          silently creating an account when an unknown identity (email or OAuth)
          attempts to sign in. The user is instead failed/prompted to sign up,
          keeping sign-in and sign-up as deliberately separate actions.
          signUpUrl ensures the sign-up affordance points at our /sign-up route.
          NOTE: this is the installed v5.7.6 behaviour, not the v7
          sign-in-or-up/withSignUp flow. Do not assume v7 docs apply. */}
      <SignIn transferable={false} signUpUrl="/sign-up" />
    </div>
  )
}
