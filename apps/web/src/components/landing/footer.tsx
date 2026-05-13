import Link from 'next/link'
import Image from 'next/image'

const columns: Record<string, { href: string; label: string }[]> = {
  'Who We Help': [
    { href: '/for/account-closed', label: 'Account deactivated or closed' },
    { href: '/for/migrants', label: 'Migrants & newcomers' },
    { href: '/for/gig-workers', label: 'Gig workers & self-employed' },
    { href: '/for/banks', label: 'Banks & fintechs' },
    { href: '/for/landlords', label: 'Landlords & letting agents' },
  ],
  'Platform': [
    { href: '/trust-portfolio', label: 'What is a Trust Portfolio?' },
    { href: '/how-it-works', label: 'How it works' },
    { href: '/how-it-works/sharing', label: 'Sharing your profile' },
    { href: '/how-it-works/privacy', label: 'Privacy & security' },
  ],
  'Company': [
    { href: '/about', label: 'About' },
    { href: '/mission', label: 'Our mission' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' },
    { href: '/faq', label: 'FAQ' },
    { href: '/partners', label: 'Partner with us' },
  ],
  'Legal': [
    { href: '/privacy-policy', label: 'Privacy policy' },
    { href: '/terms', label: 'Terms of service' },
    { href: '/cookie-policy', label: 'Cookie policy' },
    { href: '/security', label: 'Security' },
  ],
}

export function LandingFooter() {
  return (
    <footer className="border-t border-ink-border bg-ink">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-1">
            <Link href="/" className="mb-4 block">
              <Image src="/logo.png" alt="Equiscore" width={140} height={38} className="brightness-0 invert" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-cream">
              Building verified financial trust for people the system was not designed for.
            </p>
          </div>
          {Object.entries(columns).map(([title, items]) => (
            <div key={title}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-cream/50">
                {title}
              </p>
              <ul className="space-y-3">
                {items.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-cream transition-colors hover:text-teal"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-ink-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-cream/60">
            © {new Date().getFullYear()} Equiscore Ltd. All rights reserved.
          </p>
          <p className="text-xs text-cream/50">
            Equiscore is not a credit reference agency. Open Banking data is processed under your explicit consent.
          </p>
        </div>
      </div>
    </footer>
  )
}
