'use client'

import { SignUp } from '@clerk/nextjs'

// Clerk pre-fills the email field when `initialValues.emailAddress` is set.
// Used after a user joins the waitlist and clicks "Create my profile now".
export function SignUpWithEmail({ email }: { email: string }) {
  return <SignUp signInUrl="/sign-in" initialValues={{ emailAddress: email }} />
}
