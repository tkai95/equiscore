import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import { ArrowRight, Lock } from 'lucide-react'

export default function MigrantsUKFinancialSystemPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-24">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/blog" className="text-xs font-semibold uppercase tracking-widest text-teal hover:text-teal/80">← Blog</Link>
          <span className="text-cream/20">·</span>
          <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">Financial exclusion</span>
          <span className="text-xs text-cream/40">May 2025</span>
          <span className="text-xs text-cream/40">8 min read</span>
        </div>
        <h1 className="mb-6 text-3xl font-bold leading-tight text-cream lg:text-4xl">
          Arriving in the UK with a clean financial record and zero access: how the system fails migrants
        </h1>
        <p className="text-lg leading-relaxed text-cream/80">
          You may have spent years building a solid financial record: a mortgage paid on time, years of employment, savings built up carefully. None of it follows you to the UK. The credit system here has no mechanism to look for it, and no interest in trying.
        </p>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-10">
        <div className="space-y-6">

          <p className="leading-relaxed text-cream">
            The UK credit infrastructure is a closed system. It is built entirely on data collected within the UK: address history, accounts opened with UK-registered institutions, credit products taken out here. If you have always lived somewhere else, you have nothing on file. And nothing on file is treated by automated systems as functionally the same as a bad file.
          </p>

          <p className="leading-relaxed text-cream">
            UK net migration reached 944,000 in the year ending March 2023, the highest figure ever recorded. It has since fallen under policy pressure to around 345,000 in the year ending December 2024. Every one of those people arrives needing somewhere to live, a bank account and access to basic services. For most, the first extended contact with UK financial services is a string of unexplained rejections.
          </p>

          <div className="rounded-2xl border border-teal/20 bg-ink-mid p-8 my-8">
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">The numbers</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { stat: '0.9m', label: 'UK adults have no bank account at all', source: 'FCA Financial Lives 2024' },
                { stat: '7m', label: 'basic bank accounts open at designated institutions', source: 'HM Treasury 2024' },
                { stat: '6+ months', label: 'typical wait before standard credit products become accessible for new arrivals', source: 'Industry analysis' },
              ].map(({ stat, label, source }) => (
                <div key={stat} className="rounded-xl border border-ink-border bg-ink p-5 text-center">
                  <p className="mb-1 text-3xl font-bold text-teal">{stat}</p>
                  <p className="mb-2 text-sm text-cream">{label}</p>
                  <p className="text-xs text-cream/40">{source}</p>
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">What the data shows about who gets left out</h2>

          <p className="leading-relaxed text-cream">
            The FCA's Financial Lives 2024 survey found that 0.9 million UK adults have no bank account at all. That figure is striking not just in scale but in its composition. White adults make up 85% of the UK adult population but only 62% of the unbanked. Ethnic minority adults, many of whom are recent arrivals or from communities with historically weaker banking access, are significantly over-represented in that 0.9 million.
          </p>

          <p className="leading-relaxed text-cream">
            The FCA's 2024 review of payment account access found that banks were "poor at making customers aware of basic bank accounts" and that people in vulnerable circumstances, including those needing to use alternative forms of ID, were experiencing worse outcomes around account access. The review identified lack of a fixed UK address, unfamiliar documentation, and no credit history as the three primary barriers for people arriving from abroad.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">The circular problem</h2>

          <p className="leading-relaxed text-cream">
            The specific mechanism of exclusion is worth understanding. To rent a property privately, you typically need a credit check and a UK guarantor. To pass a credit check, you need a credit history. To build a credit history, you need a credit product. To get a credit product, you need a credit history and a UK address. To get a UK address, you need to rent.
          </p>

          <p className="leading-relaxed text-cream">
            Every part of the circle requires the other parts to already exist. For someone who has just arrived, none of them do. There is no formal on-ramp. The system offers no acknowledgement that a person can be financially responsible without a UK credit file to prove it.
          </p>

          <p className="leading-relaxed text-cream">
            Some providers have created basic bank accounts specifically to address this. Under the Payment Accounts Regulations 2015, the nine largest UK banks are required to offer basic bank accounts to anyone legally resident in the EU (and now, under domestic rules, the UK). As of June 2024, there were over 7 million basic bank accounts open at these institutions. But basic accounts are a floor, not a ladder. They provide access to the most minimal financial services while keeping the holder below the threshold at which standard products become available.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">When formal credit closes, informal lending fills the gap</h2>

          <p className="leading-relaxed text-cream">
            The consequences of being locked out of mainstream financial services are not abstract. When formal credit is unavailable, people find it elsewhere. A 2025 investigation by Thomson Reuters Foundation documented two Filipino women in the UK who were prosecuted for illegally lending £4.2 million to other Filipino workers, the majority of them NHS healthcare staff who could not access mainstream credit. The borrowers needed money for groceries, bills, rent and remittances. The shame of being in debt, and the implicit threat of exposure to immigration authorities, kept borrowers locked in arrangements they could not safely leave.
          </p>

          <p className="leading-relaxed text-cream">
            This is not an isolated case. The Centre for Social Justice estimated in 2023 that around one million people in the UK have borrowed from an illegal money lender. The communities most represented in that number are disproportionately those excluded from formal credit: lower-income households, recent arrivals, people with thin files or no history at all.
          </p>

          <div className="rounded-xl border border-teal/20 bg-teal/5 px-6 py-5 my-6">
            <p className="text-sm font-medium text-teal mb-2">A note on basic bank accounts</p>
            <p className="text-sm text-cream">
              Under UK law, the nine largest banks must offer a basic bank account to anyone legally resident here, regardless of credit history or immigration status. You cannot be turned down solely because you lack a UK credit file. If you are being refused, ask specifically for the basic account and, if refused again, escalate to the Financial Ombudsman Service.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">The Windrush legacy</h2>

          <p className="leading-relaxed text-cream">
            The failure to serve new arrivals fairly is not new, and the most serious documented case of institutional failure on this front remains the Windrush scandal. The Home Office used data-sharing agreements with banks to flag individuals with unresolved immigration status, resulting in British citizens, some of whom had been in the UK for decades, being wrongly denied bank accounts, healthcare and employment. The agreements were suspended in 2018 following the scandal. They were quietly reinstated in April 2023.
          </p>

          <p className="leading-relaxed text-cream">
            Human Rights Watch published a report in April 2023 concluding that the government's compensation scheme for Windrush victims "was designed to fail." As of early 2024, the majority of eligible claimants had received nothing or substantially less than they were owed. The people most affected were among those who had contributed most to UK public services, including the NHS, for decades.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">What verified evidence changes</h2>

          <p className="leading-relaxed text-cream">
            The credit reference agencies have taken small steps. Experian announced a pilot in 2023 that would allow new arrivals to build a UK credit file within three months, partly by using overseas data to bridge the gap. It is an acknowledgement that the problem exists, and a start. But it still requires time, and it still requires the person to take the initiative to navigate a system that offers no signposts.
          </p>

          <p className="leading-relaxed text-cream">
            The more immediate question is what exists now, for people who are already here and already locked out. Verified evidence of financial behaviour, built from open banking data and identity verification, does not require a UK credit history as a prerequisite. You can start from day one. The earlier you start, the more evidence builds behind you.
          </p>

          <p className="leading-relaxed text-cream">
            That is not a complete solution to a structural problem that has existed for decades. But for an individual navigating the system today, it is a tangible alternative to waiting and hoping the infrastructure eventually catches up.
          </p>

        </div>
      </article>

      <section className="bg-ink py-12">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Related reading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { href: '/blog/thin-credit-file', label: 'What is a thin credit file and why does it lock people out' },
              { href: '/blog/build-credit-history-uk', label: 'How to build a credit history in the UK when you have none' },
              { href: '/for/migrants', label: 'How Equiscore helps migrants and newcomers' },
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
            <h2 className="mb-3 text-2xl font-bold text-cream">New to the UK and facing rejections?</h2>
            <p className="mx-auto mb-7 max-w-md leading-relaxed text-cream">
              Equiscore is being built to help people build a verified Trust Portfolio from day one, without needing a UK credit history first.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {showWaitlist ? (
                <RegisterInterestButton label="Join the waitlist" variant="primary" />
              ) : (
                <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-3.5 text-base font-semibold text-ink hover:bg-teal-dark">
                  Build my profile <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link href="/for/migrants" className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-7 py-3.5 text-base font-semibold text-cream hover:border-cream/40">
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
