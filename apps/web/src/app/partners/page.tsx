import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import {
  ArrowRight,
  Building2,
  Home,
  Zap,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  FileSearch,
  Lock,
} from 'lucide-react'

const PARTNER_TYPES = [
  {
    icon: Building2,
    title: 'Banks and fintechs',
    body: 'Use Equiscore as an additional evidence layer for thin-file onboarding decisions, borderline affordability cases, and account reviews where standard bureau data returns insufficient results.',
    href: '/for/banks',
  },
  {
    icon: Home,
    title: 'Landlords and letting agents',
    body: 'Receive verified financial profiles from applicants as part of your referencing process. See income stability and payment behaviour without handling raw bank statements.',
    href: '/for/landlords',
  },
  {
    icon: CreditCard,
    title: 'Lenders and credit providers',
    body: 'Supplement bureau data with verified open banking-based affordability evidence for non-standard borrowers, self-employed applicants, and thin-file cases.',
    href: '/for/lenders',
  },
  {
    icon: Zap,
    title: 'Utility providers',
    body: 'Make better-informed onboarding decisions about direct debit terms and prepayment arrangements using verified payment behaviour and income stability data.',
    href: '/for/utilities',
  },
]

const USE_CASES = [
  {
    trigger: 'Bureau returns insufficient data',
    output: 'Trust Portfolio summary with income stability, payment behaviour and affordability signals',
    audience: 'Banks, fintechs, lenders',
  },
  {
    trigger: 'Applicant has no UK credit history',
    output: 'Verified open banking income pattern and financial behaviour evidence from day one',
    audience: 'Banks, landlords, utilities',
  },
  {
    trigger: 'Non-standard or variable income',
    output: 'Verified income range and consistency rating rather than a single payslip figure',
    audience: 'Lenders, landlords, fintechs',
  },
  {
    trigger: 'Historic CIFAS marker or account closure',
    output: 'Rehabilitation Dossier showing current verified financial behaviour alongside the historical record',
    audience: 'Banks, landlords, advisers',
  },
]

const WHAT_PARTNERS_RECEIVE = [
  {
    icon: UserCheck,
    title: 'Structured Trust Portfolio summary',
    desc: 'A verified, consent-led evidence summary including Trust Score grade, income stability rating, evidence module completion, and data coverage score. No raw transactions. No bank statements.',
  },
  {
    icon: FileSearch,
    title: 'Open banking-verified income data',
    desc: 'Income range and consistency derived from real bank data, not self-declared figures. Verified via FCA-authorised open banking infrastructure.',
  },
  {
    icon: ShieldCheck,
    title: 'Consent and audit trail',
    desc: 'Every profile shared with your organisation was actively generated and sent by the applicant. You receive a timestamp, share reference, and expiry date as part of the evidence package.',
  },
]

const WHAT_WE_DO_NOT_DO = [
  'We do not provide credit scores or credit bureau data',
  'We do not share raw bank statements or individual transactions',
  'We do not share data without the applicant generating and sending a link',
  'We do not act as a credit reference agency or regulated financial advisor',
  'We do not replace your existing onboarding or referencing process',
]

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 lg:pb-28">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-teal" />
            <span className="text-sm font-medium text-teal">Early access partnership</span>
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-[1.08] tracking-tight text-cream lg:text-6xl">
            Review better evidence
            <br />
            <span className="text-teal">before declining thin-file customers.</span>
          </h1>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-cream">
            Equiscore is an additional evidence layer for cases your standard process cannot resolve. We are building our partner network ahead of full launch and working with a select group of organisations now.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            {isPublicSite ? (
              <RegisterInterestButton label="Request partner access" variant="primary" />
            ) : (
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-teal px-8 py-4 text-base font-semibold text-ink hover:bg-teal-dark"
              >
                Request partner access <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/for/banks"
              className="inline-flex items-center gap-2 rounded-xl border border-cream/15 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/30"
            >
              How it works for banks <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Who should partner ───────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">Who we work with</p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            Built for institutions that want to see more before deciding
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Equiscore is designed for organisations that currently turn away applicants not because of demonstrated risk, but because the standard data is insufficient to make a confident decision.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNER_TYPES.map(({ icon: Icon, title, body, href }) => (
              <Link
                key={title}
                href={href}
                className="group rounded-2xl border border-ink-border bg-ink-mid p-7 transition-colors hover:border-teal/30"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-teal/20 bg-teal/10 transition-colors group-hover:border-teal/40">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="mb-3 text-base font-bold text-cream">{title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-cream">{body}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal">
                  Learn more <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ────────────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">Use cases</p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            Where Equiscore plugs the gap
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Equiscore is not a replacement for your existing process. It is the evidence layer that resolves the cases your current data cannot.
          </p>
          <div className="overflow-hidden rounded-2xl border border-ink-border">
            <div className="grid grid-cols-3 border-b border-ink-border bg-ink-mid px-6 py-3 text-xs font-bold uppercase tracking-widest text-cream/50">
              <span>Trigger</span>
              <span>What Equiscore provides</span>
              <span>Relevant for</span>
            </div>
            {USE_CASES.map(({ trigger, output, audience }, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 gap-4 px-6 py-5 text-sm ${i < USE_CASES.length - 1 ? 'border-b border-ink-border' : ''}`}
              >
                <p className="font-medium text-cream">{trigger}</p>
                <p className="text-cream">{output}</p>
                <p className="text-cream/60">{audience}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What partners receive ────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">What you receive</p>
          <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-cream lg:text-5xl">
            Structured, verified evidence. Not raw data.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-cream">
            Your team receives a clean summary of verified financial behaviour. No raw bank statements. No sensitive raw transaction data. Just the evidence needed to make a better-informed decision.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {WHAT_PARTNERS_RECEIVE.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-ink-border bg-ink-mid p-7">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="mb-3 text-base font-bold text-cream">{title}</h3>
                <p className="text-sm leading-relaxed text-cream">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What we do not do ────────────────────────────────────── */}
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">How consent works</p>
              <h2 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-cream">
                Data only flows when the applicant chooses to share it
              </h2>
              <div className="space-y-4 text-cream">
                <p className="leading-relaxed">
                  Equiscore operates on a fully consent-led model. An applicant builds their Trust Portfolio using their own data, connected via FCA-authorised open banking infrastructure. They then generate a share link and send it to you. You access their profile via that link.
                </p>
                <p className="leading-relaxed">
                  You receive a structured summary of verified evidence. The applicant can set an expiry on the link and revoke access at any time. No profile is visible to your organisation without an active, applicant-generated link.
                </p>
                <p className="leading-relaxed">
                  All data is processed under UK GDPR. Applicant data is not shared between partner organisations. No data is retained by Equiscore beyond what is necessary to operate the applicant's profile.
                </p>
              </div>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">What Equiscore does not do</p>
              <div className="rounded-2xl border border-ink-border bg-ink-mid p-7">
                <ul className="space-y-4">
                  {WHAT_WE_DO_NOT_DO.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                      <span className="text-sm text-cream">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Early access CTA ─────────────────────────────────────── */}
      <section className="bg-ink pb-28 pt-10">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-8 py-14 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
              <Lock className="h-6 w-6 text-teal" />
            </div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">Early partner programme</p>
            <h2 className="mb-5 text-4xl font-bold leading-tight text-cream">
              Join the partner programme before full launch
            </h2>
            <p className="mx-auto mb-4 max-w-xl text-lg leading-relaxed text-cream">
              We are working with a select group of institutions ahead of our full launch. Early partners shape how Equiscore integrates into real onboarding and referencing workflows.
            </p>
            <p className="mx-auto mb-10 max-w-xl leading-relaxed text-cream">
              To get in touch, email us at{' '}
              <a href="mailto:partners@equiscore.app" className="font-semibold text-teal hover:underline">
                partners@equiscore.app
              </a>{' '}
              or use the button below and we will come back to you within two business days.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isPublicSite ? (
                <RegisterInterestButton label="Request partner access" variant="primary" />
              ) : (
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal px-8 py-4 text-base font-semibold text-ink hover:bg-teal-dark"
                >
                  Get in touch <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 text-left sm:flex-row sm:gap-10">
              {[
                'Consent-led and FCA-regulated data',
                'Works alongside existing checks',
                'Consumer Duty aligned audit trail',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                  <span className="text-sm text-cream">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
