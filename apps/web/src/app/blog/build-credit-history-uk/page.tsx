import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import { ArrowRight, Lock } from 'lucide-react'

export default function BuildCreditHistoryUKPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-24">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/blog" className="text-xs font-semibold uppercase tracking-widest text-teal hover:text-teal/80">← Blog</Link>
          <span className="text-cream/20">·</span>
          <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">Practical guides</span>
          <span className="text-xs text-cream/40">May 2025</span>
          <span className="text-xs text-cream/40">8 min read</span>
        </div>
        <h1 className="mb-6 text-3xl font-bold leading-tight text-cream lg:text-4xl">
          How to build a credit history in the UK when you have none
        </h1>
        <p className="text-lg leading-relaxed text-cream/80">
          Getting credit requires a credit history. Building a credit history requires getting credit. This is a real and frustrating problem for millions of people. Here is what actually works, what does not, and how alternative evidence fills the gap while you are building.
        </p>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-10">
        <div className="space-y-6">

          <p className="leading-relaxed text-cream">
            The UK has around 5 million credit-invisible adults, people whose credit files contain too little information to produce a useful score. The average credit score is 797 out of 999. Someone starting from a thin file will typically score significantly below 600 simply because there is nothing positive to offset the absence of history. The system treats absence the same as a bad record.
          </p>

          <p className="leading-relaxed text-cream">
            This article is focused on what you can actually do to change that over time, and what you can do in the meantime while you are building.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">What genuinely helps</h2>

          <div className="space-y-4 my-6">
            {[
              {
                title: 'Register on the electoral roll',
                body: 'This is the single highest-impact thing most thin-file individuals can do immediately. Electoral roll registration is used by all three credit reference agencies to verify your identity and address. It has a direct positive effect on your score. If you are not registered, register at gov.uk/register-to-vote.',
              },
              {
                title: 'Open a credit builder credit card',
                body: 'Credit builder cards are designed for people with no or poor credit history. They carry high interest rates (often 29 to 39% APR) and low limits (typically £200 to £500). The trick is to use the card for a small, regular purchase each month and pay the full balance before the due date. You pay no interest and generate a positive payment record. Do not use these cards to borrow money you cannot immediately pay back.',
              },
              {
                title: 'Use a credit builder loan',
                body: 'Credit unions and some specialist providers offer credit builder loans. You make monthly payments into a loan account; the money is held (not given to you upfront) and released at the end of the term. Each payment is recorded as a positive credit event. They cost more than a savings account would, but they build history while you save.',
              },
              {
                title: 'Get a mobile phone contract in your name',
                body: 'Pay-monthly mobile contracts are a credit product and are reported to credit reference agencies. Getting a contract, meeting the payments and keeping it active builds positive history over time. If you cannot get a standard contract, a SIM-only plan sometimes has lower credit requirements.',
              },
              {
                title: 'Ensure your rent is reported',
                body: 'Rent payments represent the largest regular financial commitment most people make, but historically they were not reported to credit reference agencies. This is changing. Services including the Rental Exchange (run by Experian in partnership with the Big Issue Group), Credit Ladder and Canopy allow rent payments to be reported and included in your credit file. Check whether your landlord or agent participates, or sign up for a service directly.',
              },
              {
                title: 'Add yourself as an authorised user on someone else\'s account',
                body: 'If a family member or partner has a good credit history, being added as an authorised user on their credit card creates a link between your file and theirs. Their positive payment history can strengthen your file. This only works if the account is well managed. It also means your poor credit history could affect them if the link is viewed negatively.',
              },
            ].map(({ title, body }, i) => (
              <div key={i} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">{i + 1}</div>
                  <div>
                    <h3 className="mb-2 font-semibold text-cream">{title}</h3>
                    <p className="text-sm leading-relaxed text-cream">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">What does not help (common myths)</h2>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">Checking your own credit report does not hurt your score.</strong> Checking your own file is a "soft search" and is not visible to lenders. It has no effect on your score. You can check as often as you want.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">Having savings does not build credit history.</strong> Bank savings are not reported to credit reference agencies. A savings account is valuable for financial resilience but does nothing for your credit score directly.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">A debit card does not build credit history.</strong> Debit card spending is your own money and is not reported to credit reference agencies. It has no effect on your score.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">Being declined for credit hurts your score only if there was a hard search.</strong> The application itself triggers a hard search, which leaves a mark. Multiple hard searches in a short period can lower your score. Use eligibility checkers (soft search tools) before applying to test whether you are likely to be accepted.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">How long it takes</h2>

          <p className="leading-relaxed text-cream">
            Realistically, building a meaningful credit history takes six to twelve months of consistent, positive payment behaviour. Three credit accounts in good standing, reported consistently over that period, will move most thin-file individuals from an effectively unusable score to one that mainstream lenders can work with.
          </p>

          <p className="leading-relaxed text-cream">
            The timeline is longer for some situations. People who are new to the UK may face additional barriers to getting any credit product at all, even credit builder ones. People with a history of missed payments or a CIFAS marker face a different problem from a thin file and will need to address those specifically.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">What you can do now, while you are building</h2>

          <p className="leading-relaxed text-cream">
            The credit building process takes time, and during that time you may still need to apply for housing, open new accounts, or make other applications that would normally rely on a credit check. The question is what alternative evidence you can bring to support those applications while the file is still thin.
          </p>

          <p className="leading-relaxed text-cream">
            Verified open banking data, showing consistent income, regular bill payments and stable account management, is the most direct alternative. It is the evidence of financial behaviour that already exists but is not captured in the credit file. For a landlord or a specialist lender willing to look at it, it provides the context that the credit file cannot.
          </p>

          <div className="rounded-xl border border-teal/20 bg-teal/5 px-6 py-5 my-6">
            <p className="text-sm font-medium text-teal mb-2">Free resources for checking your credit score</p>
            <p className="text-sm text-cream">
              You can check your credit files for free via: Experian (free monthly report), ClearScore (Equifax data, free), Credit Karma (TransUnion data, free). Each agency may hold slightly different data, so checking all three gives the most complete picture.
            </p>
          </div>

        </div>
      </article>

      <section className="bg-ink py-12">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Related reading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { href: '/blog/thin-credit-file', label: 'What is a thin credit file and why does it matter' },
              { href: '/blog/migrants-uk-financial-system', label: 'How the UK system fails new arrivals' },
              { href: '/how-it-works', label: 'How Equiscore builds a verified Trust Portfolio' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="group flex items-center justify-between rounded-xl border border-ink-border bg-ink-mid px-5 py-4 hover:border-teal/30">
                <span className="text-sm font-medium text-cream group-hover:text-teal">{label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-teal/50" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink pb-28 pt-4">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-8 py-12 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
              <Lock className="h-5 w-5 text-teal" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-cream">Start building verified evidence of your financial behaviour today</h2>
            <p className="mx-auto mb-7 max-w-md leading-relaxed text-cream">
              Equiscore builds a Trust Portfolio from your real financial behaviour. No credit history required to start. The earlier you begin, the stronger your profile becomes.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {showWaitlist ? (
                <RegisterInterestButton label="Join the waitlist" variant="primary" />
              ) : (
                <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-3.5 text-base font-semibold text-ink hover:bg-teal-dark">
                  Build my profile <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
