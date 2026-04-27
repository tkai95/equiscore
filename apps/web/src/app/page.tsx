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

const TIERS = [
  {
    tier: 'A',
    label: 'Highly verified',
    desc: 'Strong evidence across all dimensions',
    bg: '#F0F7F5',
    border: '#C8D2C3',
    tierColor: '#123C35',
    labelColor: '#0B2F29',
  },
  {
    tier: 'B',
    label: 'Verified',
    desc: 'Good evidence, minor gaps',
    bg: '#F2F7F4',
    border: '#C8D2C3',
    tierColor: '#3D6658',
    labelColor: '#2D4E43',
  },
  {
    tier: 'C',
    label: 'Partial',
    desc: 'Some verified evidence present',
    bg: '#F5F7F5',
    border: '#C8D2C3',
    tierColor: '#8FA491',
    labelColor: '#7A8D7C',
  },
  {
    tier: 'D',
    label: 'Limited',
    desc: 'Thin evidence profile',
    bg: '#FAF7F2',
    border: '#E3D3B3',
    tierColor: '#C7A66A',
    labelColor: '#A88B55',
  },
  {
    tier: 'E',
    label: 'Developing',
    desc: 'Building towards verification',
    bg: '#F9F4F0',
    border: '#D8C0B0',
    tierColor: '#A96E52',
    labelColor: '#8B5A41',
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
    <main className="min-h-screen bg-cream">
      <LandingNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sage-light bg-cream-surface px-4 py-1.5 text-sm text-brand">
          <ShieldCheck className="h-4 w-4" />
          Trusted by applicants across the UK
        </div>
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-charcoal lg:text-6xl">
          Your financial identity,
          <br />
          <span className="text-brand">verified and trusted.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-charcoal-mid">
          Equiscore helps migrants, gig workers, students, and anyone with a thin UK credit history
          build a verified trust profile and share it confidently with landlords, lenders, and
          platforms.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <SignedOut>
            <Link
              href="/sign-up"
              className="flex items-center gap-2 rounded-xl bg-brand px-8 py-4 text-base font-semibold text-cream-surface shadow-sm hover:bg-brand-dark"
            >
              Create my profile <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border border-brand bg-cream-surface px-8 py-4 text-base font-semibold text-brand hover:bg-cream"
            >
              Sign in
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl bg-brand px-8 py-4 text-base font-semibold text-cream-surface shadow-sm hover:bg-brand-dark"
            >
              View my dashboard <ArrowRight className="h-5 w-5" />
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-[#D8D6C9] bg-cream-surface py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-charcoal-mid">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand" />
              Open Banking via FCA authorised TrueLayer
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand" />
              Bank-grade encryption
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-brand" />
              You control what gets shared
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-brand" />
              Delete your data any time
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-cream-surface py-24" id="how-it-works">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-charcoal">How it works</h2>
          <p className="mb-16 text-center text-charcoal-mid">
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
              <div key={step} className="rounded-2xl border border-[#D8D6C9] bg-cream p-6">
                <div className="mb-4 text-3xl font-bold text-sage-light">{step}</div>
                <Icon className="mb-3 h-6 w-6 text-brand" />
                <h3 className="mb-2 font-semibold text-charcoal">{title}</h3>
                <p className="text-sm text-charcoal-mid">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-charcoal">
            Built for people who don&apos;t fit the mould
          </h2>
          <p className="mb-16 text-center text-charcoal-mid">
            The UK credit system was not designed for everyone. Equiscore was.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map(({ quote, name, detail }) => (
              <div key={name} className="rounded-2xl border border-[#D8D6C9] bg-cream-surface p-6">
                <p className="mb-6 text-sm leading-relaxed text-charcoal-mid">
                  &ldquo;{quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-charcoal">{name}</p>
                  <p className="text-xs text-[#5F6761]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust tiers */}
      <section className="bg-cream-surface py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-charcoal">
            Transparent trust tiers
          </h2>
          <p className="mb-16 text-center text-charcoal-mid">
            Your trust level is always explainable. No mystery numbers, just clear signals.
          </p>
          <div className="grid gap-4 md:grid-cols-5">
            {TIERS.map(({ tier, label, desc, bg, border, tierColor, labelColor }) => (
              <div
                key={tier}
                className="rounded-xl border p-5 text-center"
                style={{ background: bg, borderColor: border }}
              >
                <div className="mb-2 text-3xl font-bold" style={{ color: tierColor }}>
                  {tier}
                </div>
                <div className="mb-1 text-sm font-semibold" style={{ color: labelColor }}>
                  {label}
                </div>
                <div className="text-xs text-charcoal-mid">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* B2B landlords teaser */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
                For landlords and letting agents
              </p>
              <h2 className="mb-6 text-3xl font-bold text-charcoal">
                Stop chasing references.
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-charcoal-mid">
                A verified Equiscore profile tells you more than a reference call ever could: income
                consistency, payment history, and financial stability, all verified directly from
                your applicant&apos;s bank.
              </p>
              <Link
                href="/for-landlords"
                className="inline-flex items-center gap-2 font-semibold text-brand hover:text-brand-dark"
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
                <div
                  key={point}
                  className="flex items-center gap-3 rounded-xl border border-[#D8D6C9] bg-cream-surface p-4"
                >
                  <ShieldCheck className="h-5 w-5 shrink-0 text-brand" />
                  <span className="text-sm font-medium text-charcoal">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream-surface py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-charcoal">Common questions</h2>
          <p className="mb-12 text-center text-charcoal-mid">
            More in our{' '}
            <Link href="/faq" className="text-brand hover:underline">
              full FAQ
            </Link>
            .
          </p>
          <div className="space-y-6">
            {faqItems.map(({ q, a }) => (
              <div key={q} className="border-b border-[#D8D6C9] pb-6">
                <p className="mb-2 font-semibold text-charcoal">{q}</p>
                <p className="text-sm leading-relaxed text-charcoal-mid">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand py-24 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-4 text-3xl font-bold text-cream-surface lg:text-4xl">
            Your profile takes about five minutes to set up.
          </h2>
          <p className="mb-8 text-sage-light">Free during beta. No payment card required.</p>
          <SignedOut>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-cream-surface px-8 py-4 text-base font-semibold text-brand shadow-sm hover:bg-cream"
            >
              Create my profile <ArrowRight className="h-5 w-5" />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-cream-surface px-8 py-4 text-base font-semibold text-brand shadow-sm hover:bg-cream"
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
