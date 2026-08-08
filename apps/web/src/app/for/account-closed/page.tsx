import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import {
  Home,
  Briefcase,
  CreditCard,
  Smartphone,
  Zap,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  Users,
  FileText,
  Lock,
} from 'lucide-react'

const REASONS = [
  {
    title: 'A CIFAS fraud marker was placed on your record',
    body: 'Banks, lenders and insurers share fraud data through a network called CIFAS. If a member organisation suspects fraud, they file a case against your details. That marker is then visible to every other CIFAS member, usually without you ever being told it happened.',
  },
  {
    title: 'You were used as a money mule',
    body: 'Young people are regularly targeted by criminals who ask them to receive or move money through their accounts. Many agree without fully understanding what they are getting into. The bank closes the account regardless of intent.',
  },
  {
    title: "The bank's own systems flagged you",
    body: 'Some closures are pure algorithm. An unusual transaction pattern, a failed verification check, or a name match on a watchlist. No human involved, no explanation given, and no formal right of appeal.',
  },
  {
    title: 'A commercial decision to exit you as a customer',
    body: 'Banks are businesses. They can and do close accounts they consider commercially undesirable. This is entirely legal and they are rarely obliged to tell you the actual reason.',
  },
  {
    title: 'An investigation that was never properly closed',
    body: 'Sometimes accounts are frozen during a fraud review and simply never unfrozen. The case closes internally, the restrictions remain on your file, and no one contacts you to let you know.',
  },
]

const BLOCKED = [
  { icon: CreditCard, label: 'New bank accounts', desc: 'Most high street banks will decline automatically' },
  { icon: Home, label: 'Renting a home', desc: 'Letting agents and landlords run fraud and credit checks' },
  { icon: Briefcase, label: 'Employment', desc: 'Financial, public sector and regulated roles require clean fraud checks' },
  { icon: Zap, label: 'Utility accounts', desc: 'Energy and broadband providers often decline or demand large deposits' },
  { icon: CreditCard, label: 'Credit and lending', desc: 'Loans, credit cards and finance are largely out of reach' },
  { icon: Smartphone, label: 'Phone contracts', desc: 'Standard credit checks are run even for basic SIM agreements' },
]

const HOW_WE_HELP = [
  {
    icon: ShieldCheck,
    title: 'Your Trust Portfolio',
    body: 'Connect your bank account and we analyse your real financial behaviour: consistent payments, responsible spending, saving patterns. We build that into a verified Trust Score that institutions can rely on.',
  },
  {
    icon: FileText,
    title: 'Your Rehabilitation Dossier',
    body: 'We compile your positive financial history into a structured document you can use to formally challenge a CIFAS marker, or present to institutions as evidence of your current reliability.',
  },
  {
    icon: Users,
    title: 'Connections to inclusive partners',
    body: 'We work with banks, landlords and lenders who look beyond fraud flags for people who can demonstrate rehabilitation. Your Trust Portfolio gets you in front of the right people.',
  },
  {
    icon: BookOpen,
    title: 'Financial literacy support',
    body: 'Demonstrating clear and appropriate use of accounts is a key requirement for removing CIFAS markers. We walk you through what is expected so you are not left guessing.',
  },
]

export default function AccountClosedPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Account deactivated or closed</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          Your account was closed.
          <br />
          <span className="text-teal">That is not the end of your story.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-cream">
          Account closures happen for a range of reasons, and the process is rarely explained clearly. In many cases, people are left without a full picture of what happened or what they can do about it.
        </p>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-cream">
          If your account was closed or restricted, understanding the cause is the first step. From there, there are practical options available, regardless of whether a fraud marker is involved.
        </p>
      </section>

      {/* ── Why it happens ───────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The reality</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Accounts get closed for more reasons than most people realise
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            And not all of them are your fault. Here is what usually happens.
          </p>
          <div className="space-y-4">
            {REASONS.map((r, i) => (
              <div key={i} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold text-cream">{r.title}</h3>
                    <p className="text-sm leading-relaxed text-cream">{r.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CIFAS explained ──────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-teal/20 bg-ink-mid p-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">What is CIFAS?</p>
            <h2 className="mb-6 text-2xl font-bold text-cream">
              The database most people have never heard of, that most institutions use every single day
            </h2>
            <p className="mb-5 leading-relaxed text-cream">
              CIFAS is the UK fraud prevention agency. Over 680 organisations are members, including virtually every high street bank, most lenders, insurers, and a growing number of letting agents and employers. When one member files a fraud case against your details, every other member can see it instantly.
            </p>
            <p className="mb-10 leading-relaxed text-cream">
              Most of those organisations will reject your application automatically, without ever telling you that a CIFAS record is the reason. You might get a vague decline letter. You might get nothing at all.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { stat: '374,000+', label: 'fraud cases filed in the UK in 2023 alone' },
                { stat: '6 years', label: 'how long a standard CIFAS marker stays on the database' },
                { stat: '680+', label: 'organisations that check CIFAS before they decide on you' },
              ].map(({ stat, label }) => (
                <div key={stat} className="rounded-xl border border-ink-border bg-ink p-5 text-center">
                  <p className="mb-2 text-3xl font-bold text-teal">{stat}</p>
                  <p className="text-sm text-cream">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 rounded-lg border border-teal/20 bg-teal/5 px-5 py-4 text-sm text-teal">
              Having a CIFAS marker does not mean you committed fraud. Many people have markers they know nothing about. You have a legal right to check your CIFAS file at any time.
            </p>
          </div>
        </div>
      </section>

      {/* ── What it blocks ───────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The real impact</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            What a closed account or fraud marker actually takes away
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            This is not just about banking. A fraud flag touches almost every part of modern life.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BLOCKED.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4 rounded-xl border border-ink-border bg-ink-mid p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <div>
                  <p className="mb-1 font-semibold text-cream">{label}</p>
                  <p className="text-sm text-cream">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who this affects ─────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The people behind the statistics</p>
          <h2 className="mb-10 text-center text-3xl font-bold text-cream">This is not a story about career fraudsters</h2>
          <div className="space-y-5">
            <p className="text-lg leading-relaxed text-cream">
              The people we hear from most are ordinary people who got caught in the wrong situation at the wrong time. Young people who were approached by someone they trusted and asked to move money through their account, often with no real understanding of what they were agreeing to.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              Immigrants who were financially naive in a new country. People who were victims of identity fraud themselves and ended up with a marker as a result. People who had no financial education growing up and never had the chance to learn the rules before they accidentally broke one.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              In many cases, the communities most affected are already dealing with the least financial support and the fewest options. A CIFAS marker on top of that is not just a problem. It is a trap.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              The fraud prevention system has one response to all of them.
            </p>
            <p className="mt-2 text-xl font-semibold text-cream">No.</p>
          </div>
        </div>
      </section>

      {/* ── Lesson not a sentence ────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-10 py-14 text-center">
            <p className="mx-auto mb-6 max-w-2xl text-3xl font-bold leading-snug text-cream lg:text-4xl">
              A mistake should be a lesson, not a lifetime sentence.
            </p>
            <p className="mx-auto mb-6 max-w-xl text-lg leading-relaxed text-cream">
              The CIFAS database has no rehabilitation framework. It does not distinguish between someone involved in organised fraud and someone who made a single mistake at nineteen. Both receive the same six-year blackout.
            </p>
            <p className="mx-auto mb-6 max-w-xl leading-relaxed text-cream">
              There is no formal appeals process. No mechanism to demonstrate that you have changed. No institution required to listen to your side of what happened. The system moves on. You are expected to wait it out, alone, for six years.
            </p>
            <p className="mx-auto max-w-xl text-lg font-semibold text-teal">
              Equiscore was built because we believe that is wrong.
            </p>
          </div>
        </div>
      </section>

      {/* ── How we help ──────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">How Equiscore helps</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            We give you the evidence to prove who you are now
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Not who you were. Not what happened years ago. What your financial behaviour actually looks like today.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {HOW_WE_HELP.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="mb-2 font-semibold text-cream">{title}</h3>
                <p className="text-sm leading-relaxed text-cream">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-ink pb-28 pt-10">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-8 py-14 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
              <Lock className="h-6 w-6 text-teal" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-cream">
              You have already done the hard part. You are still here.
            </h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-cream">
              Building your Trust Portfolio takes about 15 minutes. Everything you submit is encrypted and private. You choose exactly who sees it and when.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {showWaitlist ? (
                <RegisterInterestButton label="Join the waitlist" variant="primary" />
              ) : (
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal px-8 py-4 text-base font-semibold text-ink shadow-[0_0_24px_rgba(0,200,150,0.3)] transition-all hover:bg-teal-dark"
                >
                  Build my profile <ArrowRight className="h-5 w-5" />
                </Link>
              )}
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/40"
              >
                See how it works <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
