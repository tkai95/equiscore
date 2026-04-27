import Link from 'next/link'
import Image from 'next/image'

const columns: Record<string, { href: string; label: string }[]> = {
  Product: [
    { href: '/#how-it-works', label: 'How it works' },
    { href: '/for-landlords', label: 'For landlords' },
    { href: '/pricing', label: 'Pricing' },
  ],
  Company: [
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' },
  ],
  Legal: [
    { href: '/privacy-policy', label: 'Privacy policy' },
    { href: '/terms', label: 'Terms of service' },
    { href: '/cookie-policy', label: 'Cookie policy' },
    { href: '/security', label: 'Security' },
  ],
  Support: [
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Get help' },
  ],
}

export function LandingFooter() {
  return (
    <footer className="border-t border-[#D8D6C9] bg-cream">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-6">
          <div className="md:col-span-2">
            <Link href="/" className="mb-4 block">
              <Image src="/logo.png" alt="Equiscore" width={160} height={42} className="mix-blend-multiply" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-charcoal-mid">
              Build a verified financial identity and share it confidently with landlords, lenders,
              and employers.
            </p>
          </div>
          {Object.entries(columns).map(([title, items]) => (
            <div key={title}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#5F6761]">
                {title}
              </p>
              <ul className="space-y-3">
                {items.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-charcoal-mid transition-colors hover:text-charcoal"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-[#D8D6C9] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-charcoal-mid">
            © {new Date().getFullYear()} Equiscore Ltd. All rights reserved.
          </p>
          <p className="text-xs text-[#5F6761]">
            Equiscore is not a credit reference agency. Open Banking data is processed under your
            explicit consent.
          </p>
        </div>
      </div>
    </footer>
  )
}
