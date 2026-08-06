import { SignUp } from '@clerk/nextjs'
import { SignUpWithEmail } from './sign-up-with-email'

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  const email = typeof searchParams.email === 'string' ? searchParams.email : ''
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      {email ? (
        <SignUpWithEmail email={email} />
      ) : (
        <SignUp signInUrl="/sign-in" />
      )}
    </div>
  )
}
