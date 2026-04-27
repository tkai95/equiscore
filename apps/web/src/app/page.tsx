import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import { ArrowRight, ShieldCheck, TrendingUp, Share2, Users, Lock, Eye, Trash2 } from 'lucide-react'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'

const testimonials = [
  {
    quote:
      "I moved from Nigeria three years ago and had zero credit history. My first landlord asked for six months upfront because I couldn't pass a check. Now I send my Equiscore profile instead. My second application took two days.",
    name: 'Amara',
    detail: 'London',
  },
  {
    quote:
      "I work as a freelance designer so my income doesn't fit neatly into a payslip. Equiscore shows my actual financial picture, not a score based on a history I don't have.",
    name: 'Tom',
    detail: 'Manchester',
  },
  {
    quote:
      "I was a student until last year and had nothing on file. Equiscore showed my landlord I'd been paying rent consistently for two years. That was enough.",
    name: 'Priya',
    detail: 'Bristol',
  },
]

const faqItems = [
  {
    q: 'Is this a credit check?',
    a: "No. A credit check pulls data from agencies like Experian or Equifax. Equiscore uses Open Banking, which means we analyse your actual financial behaviour directly from your bank account.",
  },
  {
    q: 'Can my landlord see my bank transactions?',
    a: "No. Your raw transaction data stays private. What they see is your verified trust profile: your tier, the dimensions it covers, and the signals behind it.",
  },
  {
    q: 'How is the score calculated?',
    a: "We look at income consistency, payment reliability, spending stability, and account tenure. Each dimension contributes to a single tier from A down to E. You can see every signal from your dashboard.",
  },
  {
    q: 'Does it affect my credit file?',
    a: "No. Equiscore has no connection to UK credit reference agencies. Your credit file is not touched in any way.",
  },
  {
    q: 'Can I delete my data?',
    a: "Yes, any time. Go to Settings in your dashboard and delete your account. All data is removed within 30 days.",
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingNav />

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
          build a verified trust profile and share it confidently with landlords, lenders, and
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

      {/* Trust bar */}
      <section className="border-y border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Open Banking via FCA authorised TrueLayer
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              Bank-grade encryption
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              You control what gets shared
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-blue-600" />
              Delete your data any time
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-24" id="how-it-works">
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
                desc: 'Tell us about yourself: your background, work, and situation.',
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
                desc: 'Receive an explainable, multi-dimensional trust profile. Not a black box.',
              },
              {
                step: '04',
                icon: Share2,
                title: 'Share with confidence',
                desc: 'Send a secure link to landlords, employers, or lenders.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="rounded-2xl bg-gray-50 p-6">
                <div className="mb-4 text-3xl font-bold text-blue-100">{step}</div>
                <Icon className="mb-3 h-6 w-6 text-blue-600" />
                <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-gray-900">
            Built for people who don&apos;t fit the mould
          </h2>
          <p className="mb-16 text-center text-gray-600">
            The UK credit system was not designed for everyone. Equiscore was.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map(({ quote, name, detail }) => (
              <div key={name} className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="mb-6 text-sm leading-relaxed text-gray-700">&ldquo;{quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500">{detail}</p>
                </div>
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
            Your trust level is always explainable. No mystery numbers, just clear signals.
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

      {/* B2B landlords teaser */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-600">
                For landlords and letting agents
              </p>
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Stop chasing references.
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-gray-600">
                A verified Equiscore profile tells you more than a reference call ever could: income
                consistency, payment history, and financial stability, all verified directly from
                your applicant&apos;s bank.
              </p>
              <Link
                href="/for-landlords"
                className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
              >
                Learn how it works for landlords <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {[
                'Verified by Open Banking, not self-reported',
                'Faster than waiting on reference calls',
                'Raw transactions stay private',
                'Share links expire and can be revoked',
              ].map((point) => (
                <div key={point} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-gray-900">Common questions</h2>
          <p className="mb-12 text-center text-gray-600">
            More in our{' '}
            <Link href="/faq" className="text-blue-600 hover:underline">
              full FAQ
            </Link>
            .
          </p>
          <div className="space-y-6">
            {faqItems.map(({ q, a }) => (
              <div key={q} className="border-b border-gray-100 pb-6">
                <p className="mb-2 font-semibold text-gray-900">{q}</p>
                <p className="text-sm leading-relaxed text-gray-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-blue-600 py-24 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">
            Your profile takes about five minutes to set up.
          </h2>
          <p className="mb-8 text-blue-100">Free during beta. No payment card required.</p>
          <SignedOut>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-blue-600 shadow-sm hover:bg-blue-50"
            >
              Create my profile <ArrowRight className="h-5 w-5" />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-blue-600 shadow-sm hover:bg-blue-50"
            >
              Go to my dashboard <ArrowRight className="h-5 w-5" />
            </Link>
          </SignedIn>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
