import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ArrowRight, CheckCircle2, Clock, FileText, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'For Landlords',
  description: 'Accept Equiscore profiles instead of chasing references.',
}

export default function ForLandlordsPage() {
  return (
    <main className="min-h-screen bg-cream">
      <LandingNav />

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand">
              For landlords and letting agents
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-charcoal lg:text-5xl">
              Stop chasing references. Get a verified financial profile instead.
            </h1>
            <p className="mb-8 text-xl leading-relaxed text-charcoal-mid">
              Traditional references take days to come back and tell you very little. An Equiscore
              profile tells you whether someone pays consistently, earns regularly, and has the
              financial stability to be a reliable tenant.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-cream-surface hover:bg-brand-dark"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: ShieldCheck,
                title: 'Verified, not self-reported',
                body: 'Every signal in the profile is derived from real Open Banking data. Your applicant cannot fabricate their income history or payment track record.',
              },
              {
                icon: Clock,
                title: 'Faster than a reference call',
                body: 'Your applicant shares a secure link from their dashboard. You see the profile immediately. No chasing employers, no waiting on previous landlords.',
              },
              {
                icon: FileText,
                title: 'Clear and readable',
                body: 'You see a trust tier (A through E), the dimensions it covers, and the specific signals that support it. No jargon, no mystery score.',
              },
              {
                icon: CheckCircle2,
                title: 'You never see their transactions',
                body: 'Raw bank data stays private. What you receive is a verified summary: income consistency, payment reliability, and account stability.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-[#D8D6C9] bg-cream-surface p-5">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <div>
                  <p className="mb-1 font-semibold text-charcoal">{title}</p>
                  <p className="text-sm leading-relaxed text-charcoal-mid">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream-surface py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-charcoal">How it works</h2>
          <p className="mb-16 text-center text-charcoal-mid">
            Three steps from enquiry to verified profile.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Your applicant creates their profile',
                body: 'They sign up to Equiscore, connect their bank account via Open Banking, and their trust profile is generated automatically.',
              },
              {
                step: '02',
                title: 'They share a secure link with you',
                body: 'From their dashboard they generate a link. The link gives you read-only access to their verified profile. It expires after a set period.',
              },
              {
                step: '03',
                title: 'You review the profile',
                body: 'You see their trust tier, income consistency, payment history, and account stability. Enough to make an informed decision without a lengthy reference process.',
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="rounded-2xl border border-[#D8D6C9] bg-cream p-6">
                <div className="mb-4 text-3xl font-bold text-sage-light">{step}</div>
                <h3 className="mb-2 font-semibold text-charcoal">{title}</h3>
                <p className="text-sm leading-relaxed text-charcoal-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-10 text-3xl font-bold text-charcoal">Common questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Is Equiscore a credit check?',
                a: "No. An Equiscore profile is based on Open Banking data and is separate from a credit reference agency check. You can use it alongside your usual process or as a faster first-pass filter.",
              },
              {
                q: "Can I see the applicant's bank transactions?",
                a: "No. The profile shows verified signals derived from transaction data, not the underlying transactions themselves. Your applicant's full bank history stays private.",
              },
              {
                q: "What if an applicant doesn't have an Equiscore profile?",
                a: "You can ask applicants to create one. It takes about five minutes to set up. There is no cost to them during the beta period.",
              },
              {
                q: 'Is the profile legally admissible?',
                a: "Equiscore profiles are not a substitute for legally required checks such as Right to Rent verification. They are a supplementary tool to help you assess financial reliability.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-[#D8D6C9] pb-6">
                <p className="mb-2 font-semibold text-charcoal">{q}</p>
                <p className="text-sm leading-relaxed text-charcoal-mid">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-4 text-3xl font-bold text-cream-surface">
            Ready to accept Equiscore profiles?
          </h2>
          <p className="mb-8 text-sage-light">
            It&apos;s free to use. Ask your applicants to sign up and share their profile link with
            you.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-cream-surface px-6 py-3 font-semibold text-brand hover:bg-cream"
          >
            Get in touch <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
