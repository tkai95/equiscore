import Link from 'next/link'
import Image from 'next/image'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Share2,
  Users,
  Lock,
  Trash2,
  CheckCircle2,
  Clock,
  Landmark,
  FileText,
  Home,
  User,
  Star,
  ChevronRight,
  Link2,
} from 'lucide-react'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'

// ── Mockup card ─────────────────────────────────────────────────────────────

function TrustProfileMockup() {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (72 / 100) * circumference

  const rows = [
    { icon: User, label: 'Identity', status: 'verified' },
    { icon: Landmark, label: 'Banking', status: 'verified' },
    { icon: FileText, label: 'Income', status: 'partial' },
    { icon: Home, label: 'Rental history', status: 'verified' },
  ] as const

  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="EquiScore" width={110} height={28} />
        </div>
        <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">Verified in the UK</span>
        </div>
      </div>

      <div className="px-5 pb-4">
        <h3 className="text-sm font-semibold text-gray-800">EquiScore Trust Profile</h3>
      </div>

      {/* Score + description row */}
      <div className="flex items-start gap-4 px-5 pb-5">
        <div className="relative inline-flex shrink-0 items-center justify-center">
          <svg width={92} height={92} className="-rotate-90">
            <circle cx={46} cy={46} r={radius} fill="none" stroke="#E8E6DC" strokeWidth={9} />
            <circle
              cx={46}
              cy={46}
              r={radius}
              fill="none"
              strokeWidth={9}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              stroke="#123C35"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-bold text-[#123C35]">B</span>
          </div>
        </div>
        <div className="flex-1 pt-1">
          <p className="text-sm font-semibold text-[#123C35]">Verified credibility profile</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            This profile is built from verified evidence and securely shareable.
          </p>
          <p className="mt-2 text-xs font-medium text-gray-400">72 / 100</p>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Evidence rows */}
      <div className="divide-y divide-gray-50 px-5">
        {rows.map(({ icon: Icon, label, status }) => (
          <div key={label} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">{label}</span>
            </div>
            {status === 'verified' ? (
              <span className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Clock className="h-3 w-3" /> Partial
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Ready to share */}
      <div className="mt-1 flex items-center justify-center gap-2 bg-gray-50 px-5 py-3">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-gray-700">Ready to share</span>
      </div>
    </div>
  )
}

// ── Data ─────────────────────────────────────────────────────────────────────

const testimonials = [
  {
    quote:
      'I moved from Nigeria three years ago and had zero credit history. My first landlord asked for six months upfront because I could not pass a check. Now I send my Equiscore profile instead. My second application took two days.',
    name: 'Amara',
    detail: 'London',
  },
  {
    quote:
      'I work as a freelance designer so my income does not fit neatly into a payslip. Equiscore shows my actual financial picture, not a score based on a history I do not have.',
    name: 'Tom',
    detail: 'Manchester',
  },
  {
    quote:
      'I was a student until last year and had nothing on file. Equiscore showed my landlord I had been paying rent consistently for two years. That was enough.',
    name: 'Priya',
    detail: 'Bristol',
  },
]

const TIERS = [
  { tier: 'A', label: 'Highly verified', desc: 'Strong evidence across all key dimensions', bg: '#F0F7F5', border: '#123C35', tierColor: '#123C35', labelColor: '#0B2F29' },
  { tier: 'B', label: 'Verified', desc: 'Good evidence, minor gaps', bg: '#F2F7F4', border: '#C8D2C3', tierColor: '#3D6658', labelColor: '#2D4E43' },
  { tier: 'C', label: 'Partial', desc: 'Some verified evidence present', bg: '#F5F7F5', border: '#C8D2C3', tierColor: '#8FA491', labelColor: '#7A8D7C' },
  { tier: 'D', label: 'Limited', desc: 'Thin evidence profile', bg: '#FAF7F2', border: '#E3D3B3', tierColor: '#C7A66A', labelColor: '#A88B55' },
  { tier: 'E', label: 'Developing', desc: 'Building towards verification', bg: '#F9F4F0', border: '#D8C0B0', tierColor: '#A96E52', labelColor: '#8B5A41' },
]

const faqItems = [
  {
    q: 'Is this a credit check?',
    a: 'No. A credit check pulls data from agencies like Experian or Equifax. Equiscore uses Open Banking, which means we analyse your actual financial behaviour directly from your bank account.',
  },
  {
    q: 'Can my landlord see my bank transactions?',
    a: 'No. Your raw transaction data stays private. What they see is your verified trust profile: your tier, the dimensions it covers, and the signals behind it.',
  },
  {
    q: 'How is the score calculated?',
    a: 'We look at income consistency, payment reliability, spending stability, and account tenure. Each dimension contributes to a single tier from A down to E. You can see every signal from your dashboard.',
  },
  {
    q: 'Does it affect my credit file?',
    a: 'No. Equiscore has no connection to UK credit reference agencies. Your credit file is not touched in any way.',
  },
  {
    q: 'Can I delete my data?',
    a: 'Yes, any time. Go to Settings in your dashboard and delete your account. All data is removed within 30 days.',
  },
]

const TRUST_BAR = [
  { icon: Landmark, line1: 'Open Banking via', line2: 'FCA-authorised providers' },
  { icon: FileText, line1: 'Evidence-backed', line2: 'profile' },
  { icon: Lock, line1: 'You control what', line2: 'gets shared' },
  { icon: Trash2, line1: 'Delete your data', line2: 'any time' },
]

const HOW_IT_WORKS = [
  { step: '01', icon: Users, title: 'Create your profile', desc: 'Sign up in minutes and tell us a bit about yourself.' },
  { step: '02', icon: FileText, title: 'Add verified evidence', desc: 'Connect your accounts and upload documents securely.' },
  { step: '03', icon: TrendingUp, title: 'Build your EquiScore', desc: 'We analyse your evidence and calculate your score.' },
  { step: '04', icon: Share2, title: 'Share your profile', desc: 'Share with landlords, lenders, and platforms you trust.' },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-cream">
      <LandingNav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-16 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: copy + CTAs */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D8D6C9] bg-cream-surface px-4 py-1.5 text-sm text-charcoal-mid">
              <Users className="h-4 w-4 shrink-0" />
              A portable credibility profile for people new to the UK
            </div>
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-charcoal lg:text-6xl">
              Your credibility
              <br />
              should{' '}
              <span className="text-brand">travel with you.</span>
            </h1>
            <p className="mb-10 max-w-lg text-lg leading-relaxed text-charcoal-mid">
              EquiScore helps newcomers, migrants, students, gig workers, and thin-file applicants
              build a verified credibility profile they can share with landlords, lenders, and
              platforms.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <SignedOut>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-semibold text-cream-surface shadow-sm transition-colors hover:bg-brand-dark"
                >
                  Build my profile
                </Link>
                <Link
                  href="/#how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8D6C9] bg-cream-surface px-6 py-3.5 text-base font-semibold text-charcoal transition-colors hover:bg-cream"
                >
                  See how it works <ArrowRight className="h-4 w-4" />
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-semibold text-cream-surface shadow-sm transition-colors hover:bg-brand-dark"
                >
                  View my dashboard <ArrowRight className="h-5 w-5" />
                </Link>
              </SignedIn>
            </div>
          </div>

          {/* Right: product mockup */}
          <div className="flex justify-center lg:justify-end">
            <TrustProfileMockup />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-[#D8D6C9] bg-cream-surface py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {TRUST_BAR.map(({ icon: Icon, line1, line2 }) => (
              <div key={line1} className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <p className="text-sm text-charcoal-mid">
                  {line1}
                  <br />
                  {line2}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-cream py-24" id="how-it-works">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-3 text-center text-3xl font-bold text-charcoal">How it works</h2>
          <p className="mb-14 text-center text-charcoal-mid">
            Four simple steps to build and share your credibility profile.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
              <div
                key={step}
                className="group relative flex items-center gap-6 rounded-2xl border border-[#D8D6C9] bg-cream-surface p-7 transition-shadow hover:shadow-md"
              >
                {/* Icon — large, left */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-cream">
                  <Icon className="h-10 w-10 text-brand" />
                </div>
                {/* Text */}
                <div className="flex-1">
                  <p className="mb-1 text-sm font-bold tracking-widest text-[#C8D2C3]">{step}</p>
                  <h3 className="mb-1.5 text-lg font-bold text-charcoal">{title}</h3>
                  <p className="text-sm leading-relaxed text-charcoal-mid">{desc}</p>
                </div>
                <ArrowRight className="absolute right-5 bottom-5 h-4 w-4 text-[#D8D6C9] transition-colors group-hover:text-brand" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-cream-surface py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-charcoal">
            Built for people who don&apos;t fit the mould
          </h2>
          <p className="mb-16 text-center text-charcoal-mid">
            The UK credit system was not designed for everyone. Equiscore was.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map(({ quote, name, detail }) => (
              <div key={name} className="rounded-2xl border border-[#D8D6C9] bg-cream p-6">
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
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-3 text-center text-5xl font-bold text-charcoal">
            Transparent trust tiers
          </h2>
          <p className="mb-14 text-center text-charcoal-mid">
            Every EquiScore is explainable, built from clear evidence and easy to understand.
          </p>
          <div className="grid items-end gap-4 md:grid-cols-5">
            {TIERS.map(({ tier, label, desc, bg, border, tierColor, labelColor }) => {
              const isTop = tier === 'A'
              return (
                <div
                  key={tier}
                  className="relative rounded-2xl border text-center"
                  style={{
                    background: bg,
                    borderColor: border,
                    borderWidth: isTop ? 2 : 1,
                    padding: isTop ? '2.25rem 1.25rem' : '1.5rem 1.25rem',
                  }}
                >
                  {isTop && (
                    <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#123C35]">
                      <Star className="h-3.5 w-3.5 fill-white text-white" />
                    </div>
                  )}
                  <div className="mb-2 text-7xl font-bold leading-none" style={{ color: tierColor }}>
                    {tier}
                  </div>
                  <div className="mb-3 font-semibold" style={{ color: labelColor }}>
                    {label}
                  </div>
                  <div className="text-sm leading-snug text-charcoal-mid">{desc}</div>
                </div>
              )
            })}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-charcoal-mid">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Higher tiers reflect stronger verified evidence, not personal worth.</span>
          </div>
        </div>
      </section>

      {/* For landlords */}
      <section className="bg-cream-surface py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-charcoal-mid">
                For landlords and letting agents
              </p>
              <h2 className="mb-6 text-4xl font-bold text-charcoal">Stop chasing references.</h2>
              <p className="mb-8 text-lg leading-relaxed text-charcoal-mid">
                An EquiScore profile gives you a clearer view of income consistency, payment
                behaviour, and financial stability — verified through Open Banking and shared
                securely by the applicant.
              </p>
              <Link
                href="/for-landlords"
                className="inline-flex items-center gap-2 font-semibold text-brand hover:text-brand-dark"
              >
                Learn how it works for landlords <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {[
                { icon: ShieldCheck, text: 'Verified by Open Banking, not self-reported' },
                { icon: Clock, text: 'Faster than waiting on reference calls' },
                { icon: Lock, text: 'Raw transactions stay private' },
                { icon: Link2, text: 'Share links expire and can be revoked' },
              ].map(({ icon: Icon, text }, i, arr) => (
                <div
                  key={text}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <Icon className="h-5 w-5 text-charcoal-mid" />
                  </div>
                  <span className="flex-1 font-medium text-charcoal">{text}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream py-24">
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
              Build my profile <ArrowRight className="h-5 w-5" />
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
