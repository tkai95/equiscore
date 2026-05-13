import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 py-40 text-center">
        <p className="mb-4 text-6xl font-bold text-teal">404</p>
        <h1 className="mb-4 text-3xl font-bold text-cream">Page not found</h1>
        <p className="mb-10 text-lg text-cream">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-3 font-semibold text-ink hover:bg-teal-dark"
        >
          Back to home <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
      <LandingFooter />
    </div>
  )
}
