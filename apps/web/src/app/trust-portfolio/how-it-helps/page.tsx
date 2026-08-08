import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import {
  ArrowRight,
  Lock,
  Home,
  CreditCard,
  Zap,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'

export default function HowItHelpsPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Trust Portfolio</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          Where your Trust Portfolio
          <br />
          <span className="text-teal">can open doors.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-cream">
          The traditional credit file decides who gets access to the most basic financial services. For a significant number of people, that file is thin, blank, or marked by events that do not accurately represent their current situation.
        </p>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-cream">
          Your Trust Portfolio is a verified alternative. Here is where it makes a practical difference.
        </p>
      </section>

      {/* ── Section nav ──────────────────────────────────────────── */}
      <section className="bg-ink pb-4 pt-0">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Home, label: 'Renting', href: '#renting' },
              { icon: CreditCard, label: 'Bank accounts', href: '#bank-accounts' },
              { icon: Zap, label: 'Utilities', href: '#utilities' },
              { icon: TrendingUp, label: 'Credit & lending', href: '#credit' },
            ].map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-ink-border bg-ink-mid px-5 py-4 transition-colors hover:border-teal/30"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal/20 bg-teal/10">
                  <Icon className="h-4 w-4 text-teal" />
                </div>
                <span className="text-sm font-semibold text-cream">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Renting ──────────────────────────────────────────────── */}
      <section className="bg-ink py-20" id="renting">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
              <Home className="h-4 w-4 text-teal" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal">Renting a home</p>
          </div>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Get past the referencing stage
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center leading-relaxed text-cream">
            Tenant referencing is one of the most common points of failure for people with a limited or marked credit file. Landlords and letting agents almost always require a credit check as part of the process, and the result is often binary: pass or fail.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                title: 'Something to put alongside your application',
                body: 'When you share your Trust Portfolio with a landlord or letting agent, they receive a structured, verified summary of your financial behaviour. Income range, payment consistency, account stability. It gives them a picture of you that a credit check alone cannot provide.',
              },
              {
                title: 'Proof of rent payment history',
                body: 'If you have been renting and paying on time, that history can be included in your Trust Portfolio as a verified evidence module. It is the kind of track record that should count but often goes unrecognised by standard referencing systems.',
              },
              {
                title: 'Useful when you have no UK credit history',
                body: 'New arrivals, recent graduates and people who have never taken out credit are particularly affected by a thin file. Your Trust Portfolio builds from the financial behaviour you already have, regardless of what a credit bureau can or cannot see.',
              },
              {
                title: 'You control what you share and when',
                body: 'You generate a share link when you are ready to apply. The landlord or agent sees your verified summary. Once the tenancy decision is made, you revoke access from your dashboard. Nothing stays shared beyond what you chose.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="mb-2 flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  <h3 className="font-semibold text-cream">{title}</h3>
                </div>
                <p className="pl-6 text-sm leading-relaxed text-cream">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bank accounts ────────────────────────────────────────── */}
      <section className="bg-ink py-20" id="bank-accounts">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
              <CreditCard className="h-4 w-4 text-teal" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal">Bank accounts</p>
          </div>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Getting banked when the system says no
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center leading-relaxed text-cream">
            Millions of people in the UK are refused standard bank accounts or are stuck on basic accounts with limited functionality. The reasons range from a thin credit file to a previous account closure, to fraud markers that may have been applied incorrectly or to the wrong person.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                title: 'More than a credit score',
                body: 'Some banks and challenger providers have committed to reviewing applications on the basis of real financial evidence, not just a bureau check. Your Trust Portfolio gives those providers something meaningful to assess you on.',
              },
              {
                title: 'Relevant for account closure cases',
                body: 'If your previous account was closed and you are struggling to open a new one, your Trust Portfolio can demonstrate your current financial behaviour. It does not erase what is on your record, but it gives providers additional context to make a fairer decision.',
              },
              {
                title: 'Useful for newcomers with no UK history',
                body: 'Many new arrivals are refused even basic accounts due to a lack of UK financial history. A verified Trust Portfolio built from open banking data can accompany your application to providers who are willing to look beyond the standard check.',
              },
              {
                title: 'Evidence that travels with you',
                body: 'Your Trust Portfolio is yours. It goes with you to any provider you choose to share it with. You are not starting from scratch every time you apply. You have a growing verified record that builds over time.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="mb-2 flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  <h3 className="font-semibold text-cream">{title}</h3>
                </div>
                <p className="pl-6 text-sm leading-relaxed text-cream">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Utilities ────────────────────────────────────────────── */}
      <section className="bg-ink py-20" id="utilities">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
              <Zap className="h-4 w-4 text-teal" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal">Utilities</p>
          </div>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Setting up energy, broadband and beyond
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center leading-relaxed text-cream">
            Most utility providers run credit checks before they agree to a direct account. For people with a thin or marked credit file, that means deposits, prepayment meters or outright refusals. These are not optional services.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                title: 'Avoid unnecessary deposits',
                body: 'Some providers use alternative data to assess risk when a standard credit check comes up short. A verified Trust Portfolio showing stable income and a consistent record of bill payments can support an application without the need for an upfront deposit.',
              },
              {
                title: 'Bill payment history as evidence',
                body: 'Your Trust Portfolio includes a module for rent and bill payments. If you have been paying utilities on time, that track record can be verified and included in your profile, creating a positive evidence trail that standard checks cannot see.',
              },
              {
                title: 'Access to providers who use alternative data',
                body: 'We work with utility providers who have agreed to assess applications using verified Trust Portfolio data alongside or instead of a traditional credit bureau check. Your portfolio gets you in front of providers who are willing to look at the full picture.',
              },
              {
                title: 'Particularly relevant after a disruption',
                body: 'If your access to utilities has been interrupted by an account closure, a move abroad or a period of financial difficulty, your Trust Portfolio allows you to demonstrate your current situation rather than having a past event dictate your options.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="mb-2 flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  <h3 className="font-semibold text-cream">{title}</h3>
                </div>
                <p className="pl-6 text-sm leading-relaxed text-cream">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Credit & lending ─────────────────────────────────────── */}
      <section className="bg-ink py-20" id="credit">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
              <TrendingUp className="h-4 w-4 text-teal" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal">Credit & lending</p>
          </div>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            A stronger case when you apply for credit
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center leading-relaxed text-cream">
            Credit decisions have traditionally relied on a narrow set of data points, most of which disadvantage people who have had gaps in their financial life, never borrowed before, or arrived in the UK from elsewhere. Your Trust Portfolio provides additional verified context.
          </p>
          <div className="mb-10 rounded-xl border border-ink-border bg-ink-mid p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal/70">Important</p>
            <p className="text-sm leading-relaxed text-cream">
              Your Trust Portfolio is not a credit score and does not replace one. It is a complementary layer of verified evidence that works alongside your credit file. It gives lenders additional context they can use to make a more informed decision, particularly in cases where the credit file alone is thin or does not tell the full story.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                title: 'Evidence of income and affordability',
                body: 'Lenders need to assess whether you can meet repayments. Your Trust Portfolio provides verified income data and a picture of your regular outgoings. This is the kind of affordability evidence that supports a lending decision, even when a credit check comes back limited.',
              },
              {
                title: 'Relevant for thin-file applicants',
                body: 'If you have never borrowed before, you will have limited credit history for lenders to assess. Your Trust Portfolio provides verified evidence of financial behaviour that demonstrates responsibility without requiring a borrowing track record.',
              },
              {
                title: 'Useful for gig workers and the self-employed',
                body: 'Standard affordability assessments often struggle with variable or non-PAYE income. Your Trust Portfolio assesses income patterns over a longer window, giving lenders a fair view of earnings that a payslip request would fail to capture.',
              },
              {
                title: 'Works alongside your existing credit file',
                body: 'You do not have to choose between sharing your Trust Portfolio and going through a standard credit check. Your portfolio adds to the picture. It does not compete with the information held by the credit bureaus. It fills in the gaps they cannot see.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="mb-2 flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  <h3 className="font-semibold text-cream">{title}</h3>
                </div>
                <p className="pl-6 text-sm leading-relaxed text-cream">{body}</p>
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
              <ShieldCheck className="h-6 w-6 text-teal" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-cream">Build your Trust Portfolio</h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-cream">
              Start building the verified financial profile that works across renting, banking, utilities and lending.
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
                href="/trust-portfolio"
                className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/40"
              >
                What is a Trust Portfolio <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
