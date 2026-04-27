import Link from 'next/link'

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
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="mb-4 block text-xl font-bold text-blue-600">
              Equiscore
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-gray-500">
              Build a verified financial identity and share it confidently with landlords, lenders,
              and employers.
            </p>
          </div>
          {Object.entries(columns).map(([title, items]) => (
            <div key={title}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {title}
              </p>
              <ul className="space-y-3">
                {items.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-gray-100 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Equiscore Ltd. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            Equiscore is not a credit reference agency. Open Banking data is processed under your
            explicit consent.
          </p>
        </div>
      </div>
    </footer>
  )
}
