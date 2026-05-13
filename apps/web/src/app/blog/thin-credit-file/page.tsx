import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import { ArrowRight, Lock } from 'lucide-react'

export default function ThinCreditFilePage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-24">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/blog" className="text-xs font-semibold uppercase tracking-widest text-teal hover:text-teal/80">← Blog</Link>
          <span className="text-cream/20">·</span>
          <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">Financial exclusion</span>
          <span className="text-xs text-cream/40">May 2025</span>
          <span className="text-xs text-cream/40">7 min read</span>
        </div>
        <h1 className="mb-6 text-3xl font-bold leading-tight text-cream lg:text-4xl">
          What is a thin credit file and why does it lock people out of financial services
        </h1>
        <p className="text-lg leading-relaxed text-cream/80">
          Around 5 million UK adults are effectively invisible to the financial system. Not because of anything they have done wrong. Because there is not enough information on file for the system to form a view. And in the absence of evidence, the system defaults to no.
        </p>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-10">
        <div className="space-y-6">

          <p className="leading-relaxed text-cream">
            A thin credit file is a file that exists but contains too little information to produce a reliable credit score. The industry term is "credit invisible" when there is no file at all, and "thin file" when there is a file with minimal history. In practice, the effect is the same: automated credit systems cannot produce a meaningful assessment, and the standard response is a decline.
          </p>

          <p className="leading-relaxed text-cream">
            Experian's 2022 analysis identified 5,049,129 UK individuals whose credit files were "virtually invisible to the financial system." That figure represents approximately 9% of all UK adults. They are not people who have managed money badly. They are people the system simply cannot see.
          </p>

          <div className="rounded-2xl border border-teal/20 bg-ink-mid p-8 my-8">
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Credit invisibility in the UK</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { stat: '5m+', label: 'UK adults are credit invisible or have a thin file', source: 'Experian 2022' },
                { stat: '1 in 5', label: 'UK adults had a credit application declined in the previous 12 months', source: 'Money and Pensions Service 2023' },
                { stat: '17.7%', label: 'of people in Sheffield Central have no credit file at all', source: 'Experian geographic analysis' },
              ].map(({ stat, label, source }) => (
                <div key={stat} className="rounded-xl border border-ink-border bg-ink p-5 text-center">
                  <p className="mb-1 text-3xl font-bold text-teal">{stat}</p>
                  <p className="mb-2 text-sm text-cream">{label}</p>
                  <p className="text-xs text-cream/40">{source}</p>
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">How credit files actually work</h2>

          <p className="leading-relaxed text-cream">
            Three credit reference agencies hold the vast majority of UK consumer credit data: Experian, Equifax and TransUnion. They collect information from lenders, banks, utility providers and public records. The information they hold includes: credit accounts you have opened and how you have managed them; electoral roll registrations; court records (County Court Judgments, bankruptcies); and some payment history from utility providers.
          </p>

          <p className="leading-relaxed text-cream">
            A "scoreable" credit file is one with enough data to produce a reliable score. The minimum typically required is at least three months of account history and at least one active credit account. If your file falls below that threshold, the agency can still produce a score but it will be low by default, carrying an implicit penalty for the absence of data rather than reflecting any actual financial behaviour.
          </p>

          <p className="leading-relaxed text-cream">
            The average UK Experian credit score is 797 out of 999. Someone with a thin file will often score well below 600 simply because there is nothing positive to offset the structural lack of history. They are not being penalised for doing something wrong. They are being penalised for the system not having enough information about them.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Who ends up with a thin file</h2>

          <p className="leading-relaxed text-cream">
            The groups most likely to have thin or non-existent credit files follow a predictable pattern.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">Young adults</strong> turning 18 have no credit history by definition. The credit system has no record of their financial behaviour because they have not yet been eligible to take out credit products. They start from zero and must build from scratch by taking on products specifically designed to build credit, often at worse terms than those available to people with history.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">People who manage money in cash</strong> or use prepaid cards build no credit history. Someone who rents privately, pays bills by direct debit, and never borrows anything may be financially impeccable and completely invisible to the credit system.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">Older people who have paid off their mortgage</strong> and no longer use credit products often find their file becomes thin over time. Years of responsible behaviour and all the associated history gradually ages off. They can find themselves declined for basic products they could easily afford.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">New arrivals</strong> have no UK credit history by definition. Their file is blank, regardless of financial history elsewhere.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">Recently separated or divorced people</strong> may have had credit in joint names for years. When that joint history ends and they need to establish a solo file, it can be thinner than expected.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">The geographic concentration of thin files</h2>

          <p className="leading-relaxed text-cream">
            Experian's geographic analysis found that thin files are heavily concentrated in specific areas. Sheffield Central had 17.7% of its population with no credit file. Edinburgh North and Leith had 16.1%, Edinburgh East 15.9%. These are not areas defined by high rates of financial irresponsibility. They are areas with higher concentrations of students, younger residents and more transient populations, groups who are more likely to be starting out financially or to have recently moved.
          </p>

          <p className="leading-relaxed text-cream">
            The geographic concentration matters because the effects compound at the community level. Areas with high rates of credit invisibility face structural barriers to economic activity: difficulty accessing mortgages, higher rental rejection rates, fewer businesses able to secure credit. The credit system produces inequality geographically as well as demographically.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">The circular problem of building from nothing</h2>

          <p className="leading-relaxed text-cream">
            The Money and Pensions Service found in 2023 that one in five UK adults had been declined for credit in the previous 12 months. The FCA's Financial Lives 2024 survey found that 5.5 million people had avoided applying for credit in the two years prior, assuming they would be turned down. That is not a population that has given up on managing money responsibly. It is a population that has learned the system is not calibrated to see them.
          </p>

          <p className="leading-relaxed text-cream">
            Building a credit history from a thin file requires getting onto credit products. Most credit products require a credit history to access on reasonable terms. The products specifically designed for thin files, such as credit-builder cards, carry high interest rates and require consistent use over months to register meaningful improvement. Many people either cannot or choose not to pay for the privilege of building evidence of something they have been demonstrating in cash their entire adult lives.
          </p>

          <div className="rounded-xl border border-teal/20 bg-teal/5 px-6 py-5 my-6">
            <p className="text-sm font-medium text-teal mb-2">70% of UK adults think credit scoring is unfair</p>
            <p className="text-sm text-cream">
              A 2023 Responsible Finance survey of 2,000 UK adults found 70% believe it is unfair for postcode to negatively affect a credit score, and 55% think penalising people for having a thin file is unfair. Only 4% think location should be a factor at all in credit decisions.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">What alternative evidence can do</h2>

          <p className="leading-relaxed text-cream">
            The credit system's inability to see thin-file individuals is a data problem as much as a structural one. The financial behaviour exists. The rent payments, the bill payments, the cash management that never produces a credit history, it is all there in transaction data. It is just not in the format that the credit reference agencies collect.
          </p>

          <p className="leading-relaxed text-cream">
            Open banking makes that data accessible in a structured, verified way. If your transaction history shows consistent income, regular outgoings met on time, and stable balance management, that is evidence of financial reliability. It does not require you to have taken out a credit card or a loan. It does not require you to have a file at Experian. It requires you to have a bank account and a history of using it responsibly, which is precisely the population that thin-file exclusion affects.
          </p>

          <p className="leading-relaxed text-cream">
            That is not a complete fix for a structural problem in credit scoring. But for an individual who cannot get onto the credit ladder through the standard route, it is a way to build and share verified evidence of financial behaviour that the main system has never been able to see.
          </p>

        </div>
      </article>

      <section className="bg-ink py-12">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Related reading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { href: '/blog/build-credit-history-uk', label: 'How to build a credit history in the UK when you have none' },
              { href: '/blog/financial-equity-credit-system', label: 'The credit system was not designed for everyone' },
              { href: '/for/thin-file', label: 'How Equiscore helps people with thin credit files' },
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
            <h2 className="mb-3 text-2xl font-bold text-cream">Thin file or no credit history?</h2>
            <p className="mx-auto mb-7 max-w-md leading-relaxed text-cream">
              Equiscore builds a verified Trust Portfolio from your real financial behaviour, not your credit file. No history required to start.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isPublicSite ? (
                <RegisterInterestButton label="Join the waitlist" variant="primary" />
              ) : (
                <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-3.5 text-base font-semibold text-ink hover:bg-teal-dark">
                  Build my profile <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link href="/for/thin-file" className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-7 py-3.5 text-base font-semibold text-cream hover:border-cream/40">
                See how we help <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
