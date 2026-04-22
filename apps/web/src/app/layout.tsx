import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/providers'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: { default: 'Equiscore', template: '%s | Equiscore' },
  description:
    'Build and share a verified trust profile — for migrants, gig workers, students, and anyone with a thin UK financial footprint.',
  keywords: ['trust score', 'credit alternative', 'rental reference', 'financial identity'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/onboarding"
    >
      <html lang="en" suppressHydrationWarning>
        <body className={inter.variable}>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
