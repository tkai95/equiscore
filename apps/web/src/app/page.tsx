import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import { ArrowRight, ShieldCheck, TrendingUp, Share2, Users } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-blue-600">Equiscore</span>
          <div className="flex items-center gap-4">
            <SignedOut>
              <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create your profile
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Go to dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm text-blue-700">
          <ShieldCheck className="h-4 w-4" />
          Trusted by applicants across the UK
        </div>
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 lg:text-6xl">
          Your financial identity,
          <br />
          <span className="text-blue-600">verified and trusted.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-600">
          Equiscore helps migrants, gig workers, students, and anyone with a thin UK credit history
          build a verified trust profile — and share it confidently with landlords, lenders, and
          platforms.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <SignedOut>
            <Link
              href="/sign-up"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Create my profile <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-900 hover:bg-gray-50"
            >
              Sign in
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              View my dashboard <ArrowRight className="h-5 w-5" />
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-gray-900">How it works</h2>
          <p className="mb-16 text-center text-gray-600">
            Four steps to a verified, shareable trust profile.
          </p>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: '01',
                icon: Users,
                title: 'Create your profile',
                desc: 'Tell us about yourself — your background, work, and situation.',
              },
              {
                step: '02',
                icon: ShieldCheck,
                title: 'Connect your bank',
                desc: 'Securely connect via Open Banking to verify your financial activity.',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Get your trust score',
                desc: 'Receive an explainable, multi-dimensional trust profile — not a black box.',
              },
              {
                step: '04',
                icon: Share2,
                title: 'Share with confidence',
                desc: 'Send a secure link to landlords, employers, or lenders.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 text-3xl font-bold text-blue-100">{step}</div>
                <Icon className="mb-3 h-6 w-6 text-blue-600" />
                <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust tiers */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-gray-900">
            Transparent trust tiers
          </h2>
          <p className="mb-16 text-center text-gray-600">
            Your trust level is always explainable. No mystery numbers — just clear signals.
          </p>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              { tier: 'A', label: 'Highly verified', color: 'emerald', desc: 'Strong evidence across all dimensions' },
              { tier: 'B', label: 'Verified', color: 'blue', desc: 'Good evidence, minor gaps' },
              { tier: 'C', label: 'Partial', color: 'amber', desc: 'Some verified evidence present' },
              { tier: 'D', label: 'Limited', color: 'orange', desc: 'Thin evidence profile' },
              { tier: 'E', label: 'Review needed', color: 'red', desc: 'Insufficient evidence to assess' },
            ].map(({ tier, label, color, desc }) => (
              <div
                key={tier}
                className={`rounded-xl border p-5 text-center border-${color}-200 bg-${color}-50`}
              >
                <div className={`mb-2 text-3xl font-bold text-${color}-600`}>{tier}</div>
                <div className={`mb-1 text-sm font-semibold text-${color}-700`}>{label}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Equiscore. All rights reserved.
        </div>
      </footer>
    </main>
  )
}
