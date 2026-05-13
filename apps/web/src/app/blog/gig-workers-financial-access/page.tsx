import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import { ArrowRight, Lock } from 'lucide-react'

export default function GigWorkersFinancialAccessPage() {
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
          Why the gig economy leaves workers financially stranded
        </h1>
        <p className="text-lg leading-relaxed text-cream/80">
          There are 4.2 million self-employed people in the UK. Many earn well. Many earn consistently. The financial system, designed around a permanent employer and a monthly payslip, was not built to assess them fairly and largely does not try.
        </p>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-10">
        <div className="space-y-6">

          <p className="leading-relaxed text-cream">
            The mortgage application sits on the kitchen table. Two years of accounts, SA302 tax calculations, bank statements for the last six months, references from repeat clients. It has taken three weeks to compile. The lender declines. The reason given is that the income is "too irregular." The applicant earned more last year than the average UK salary. It did not matter.
          </p>

          <p className="leading-relaxed text-cream">
            This is not an unusual experience. According to a 2024 survey by The Mortgage Lender, 45% of non-PAYE workers who have applied for a mortgage have had at least one application rejected. Among specifically gig economy and zero-hours contract workers, that figure rises to 64%. More than two thirds of this group have had a mortgage application declined.
          </p>

          <div className="rounded-2xl border border-teal/20 bg-ink-mid p-8 my-8">
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">The scale of the problem</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { stat: '4.2m', label: 'self-employed people in the UK', source: 'ONS / IPSE 2024' },
                { stat: '64%', label: 'of gig and zero-hours workers have had a mortgage application declined', source: 'The Mortgage Lender / Censuswide 2024' },
                { stat: '4 in 10', label: 'self-employed people have considered giving up their business to get a mortgage', source: 'IPSE survey' },
              ].map(({ stat, label, source }) => (
                <div key={stat} className="rounded-xl border border-ink-border bg-ink p-5 text-center">
                  <p className="mb-1 text-3xl font-bold text-teal">{stat}</p>
                  <p className="mb-2 text-sm text-cream">{label}</p>
                  <p className="text-xs text-cream/40">{source}</p>
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">Why the system breaks for variable income</h2>

          <p className="leading-relaxed text-cream">
            The mainstream mortgage and credit system was designed for a world where most working adults receive a fixed monthly salary from a single employer. The income assessment frameworks used by lenders, and the automated systems that process most applications, are calibrated to that model. A payslip from an employer is legible to the system. Three months of variable income from multiple sources is not.
          </p>

          <p className="leading-relaxed text-cream">
            The practical problem shows up in several specific ways. Most lenders require two to three years of accounts for self-employed applicants. They take either the most recent year's income or an average of the two most recent years, whichever is lower. This means a contractor who had a quieter year followed by a significantly stronger year is assessed on a blended figure that understates their current financial position. A freelancer who increased their income substantially over three years gets no credit for the trajectory.
          </p>

          <p className="leading-relaxed text-cream">
            The reasons applicants themselves report for rejection tell the same story. 30% said their profession was considered too unsteady or irregular. 28% cited the volatile nature of their income. These are not rejections based on evidence of financial irresponsibility. They are rejections based on the structure of how someone works, not whether they are reliable.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">It goes beyond mortgages</h2>

          <p className="leading-relaxed text-cream">
            The mortgage barrier gets the most attention, partly because it is the most consequential. But the same logic applies across financial services. Research reported in 2024 found that 74% of UK gig workers have been denied access to basic financial products such as a personal loan, even when they have an otherwise adequate credit score. The income structure is enough to trigger an automatic decline.
          </p>

          <p className="leading-relaxed text-cream">
            Rental applications present the same barrier. Landlords and letting agents request proof of income, and the standard expectation is employment payslips. A contractor with a company account, three years of tax returns and a healthy bank balance may still be required to provide a guarantor, pay six months rent upfront, or simply be turned away. The evidence of reliability is there. The system has no mechanism to read it.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">The human cost</h2>

          <p className="leading-relaxed text-cream">
            The IPSE survey found that 83% of self-employed people believe the mortgage system is stacked against them. Four in ten have considered giving up their business simply to become eligible for a mortgage. These are not marginal workers. They are often highly skilled professionals: consultants, software engineers, creative professionals, tradespeople with years of consistent work. The choice between continuing self-employment and owning a home is a real choice that significant numbers are being forced to make.
          </p>

          <p className="leading-relaxed text-cream">
            The downstream consequences extend further than housing. 30% of gig workers surveyed by The Mortgage Lender paid higher rent to live where they wanted because buying was not possible. 27% lived in a less preferred area. 25% delayed starting a family. The financial barriers created by an inflexible income assessment system ripple into decisions that have nothing to do with financial risk.
          </p>

          <div className="rounded-xl border border-teal/20 bg-teal/5 px-6 py-5 my-6">
            <p className="text-sm font-medium text-teal mb-2">Industry pressure is building</p>
            <p className="text-sm text-cream">
              In February 2025, Introducer Today reported that the mortgage industry had been "slammed for barriers against self-employed entrepreneurs," citing the growing gap between the sector's economic contribution (freelancers alone contribute an estimated £184bn to the UK economy annually, per IPSE) and its access to financial products. The FCA is examining whether automated income assessment processes are producing unfair outcomes for non-standard earners.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">What better evidence would change</h2>

          <p className="leading-relaxed text-cream">
            The problem is not that gig workers and the self-employed are a bad risk. The evidence suggests the opposite: people who manage their own finances without an employer to fall back on often develop a more careful relationship with money than the average PAYE employee. The problem is that the standard evidence the system uses, a payslip, does not exist for this group.
          </p>

          <p className="leading-relaxed text-cream">
            Open banking data changes what is legible. Transaction history makes income regularity, bill payment consistency and balance management visible over time, not just at a single point. A freelancer who earns variably but consistently, pays every direct debit on time, and keeps a stable balance is financially legible through transaction data in a way they are not through a single payslip.
          </p>

          <p className="leading-relaxed text-cream">
            The market is already moving in this direction. Specialist self-employed mortgage lenders are taking a broader view of income evidence. The question is whether the mainstream follows, and how quickly. In the meantime, the people doing the work are navigating a system that was not designed for them and has not been updated to fit.
          </p>

        </div>
      </article>

      <section className="bg-ink py-12">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Related reading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { href: '/blog/prove-income-freelancer-uk', label: 'How to prove income as a freelancer in the UK' },
              { href: '/blog/build-credit-history-uk', label: 'How to build a credit history when you have none' },
              { href: '/for/gig-workers', label: 'How Equiscore helps gig workers and the self-employed' },
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
            <h2 className="mb-3 text-2xl font-bold text-cream">Self-employed and facing financial barriers?</h2>
            <p className="mx-auto mb-7 max-w-md leading-relaxed text-cream">
              Equiscore uses open banking data to verify income patterns over time, giving non-PAYE earners a way to show financial reliability on their own terms.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isPublicSite ? (
                <RegisterInterestButton label="Join the waitlist" variant="primary" />
              ) : (
                <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-3.5 text-base font-semibold text-ink hover:bg-teal-dark">
                  Build my profile <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link href="/for/gig-workers" className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-7 py-3.5 text-base font-semibold text-cream hover:border-cream/40">
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
