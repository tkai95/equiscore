import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/providers'
import { CookieBanner } from '@/components/landing/cookie-banner'
import { Analytics } from '@/components/landing/analytics'
import { isPublicSite } from '@/lib/site'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: { default: 'Equiscore', template: '%s | Equiscore' },
  description:
    'Build and share a verified trust profile. For migrants, gig workers, students, and anyone with a thin UK financial footprint.',
  keywords: ['trust score', 'credit alternative', 'rental reference', 'financial identity', 'open banking'],
  metadataBase: new URL('https://equiscore.app'),
  openGraph: {
    title: 'Equiscore — Your financial identity, verified and trusted',
    description:
      'Build and share a verified trust profile. For migrants, gig workers, students, and anyone with a thin UK financial footprint.',
    url: 'https://equiscore.app',
    siteName: 'Equiscore',
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Equiscore — Your financial identity, verified and trusted',
    description:
      'Build and share a verified trust profile. For migrants, gig workers, students, and anyone with a thin UK financial footprint.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  const inner = (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
        <CookieBanner />
        {gaId && <Analytics gaId={gaId} />}
      </body>
    </html>
  )

  if (isPublicSite) return inner

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/onboarding"
    >
      {inner}
    </ClerkProvider>
  )
}
