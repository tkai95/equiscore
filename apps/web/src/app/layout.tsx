import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/providers'
import { CookieBanner } from '@/components/landing/cookie-banner'
import { Analytics } from '@/components/landing/analytics'
import { isPublicSite } from '@/lib/site'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// Display face — reserved for the Trust Score number, tier and major
// assessment conclusions. Refined high-contrast serif that relates to the
// wordmark; swap by changing this one import + --font-display.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600'],
})

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
      <body className={`${inter.variable} ${fraunces.variable}`}>
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
