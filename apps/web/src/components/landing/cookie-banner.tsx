'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie-consent')) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('cookie-consent', 'all')
    window.dispatchEvent(new Event('cookie-consent-accepted'))
    setVisible(false)
  }

  function decline() {
    localStorage.setItem('cookie-consent', 'necessary')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#D8D6C9] bg-cream-surface px-4 py-4 shadow-lg sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-charcoal-mid">
          We use cookies to understand how you use Equiscore and to improve your experience. Read
          our{' '}
          <Link href="/cookie-policy" className="text-brand underline hover:no-underline">
            cookie policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={decline}
            className="rounded-lg border border-brand px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-cream"
          >
            Necessary only
          </button>
          <button
            onClick={accept}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream-surface transition-colors hover:bg-brand-dark"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
