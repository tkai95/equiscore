import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import { ArrowRight, Lock } from 'lucide-react'

export default function ProveIncomeFreelancerUKPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-24">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/blog" className="text-xs font-semibold uppercase tracking-widest text-teal hover:text-teal/80">← Blog</Link>
          <span className="text-cream/20">·</span>
          <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">Practical guides</span>
          <span className="text-xs text-cream/40">May 2025</span>
          <span className="text-xs text-cream/40">7 min read</span>
        </div>
        <h1 className="mb-6 text-3xl font-bold leading-tight text-cream lg:text-4xl">
          How to prove your income as a freelancer or self-employed person in the UK
        </h1>
        <p className="text-lg leading-relaxed text-cream/80">
          Landlords, lenders and banks all ask for proof of income. If you are self-employed, the answer is never as simple as a payslip. This guide covers what different institutions actually need, what to prepare, and how to present variable income clearly.
        </p>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-10">
        <div className="space-y-6">

          <p className="leading-relaxed text-cream">
            The UK has 4.2 million self-employed people and 2 million freelancers. Most of them will, at some point, need to prove their income to a landlord, a mortgage lender, a bank or a utility provider. The standard documents those institutions expect, a payslip and an employer letter, do not exist. What counts as proof depends entirely on who is asking.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">The documents most institutions accept</h2>

          <div className="space-y-4 my-6">
            {[
              {
                title: 'SA302 tax calculation',
                body: 'The SA302 is the official HMRC document showing your self-assessment tax calculation for a given year. It is the most widely accepted proof of income for self-employed people. You can download it from your HMRC online account (via Government Gateway) or receive it by post after submitting your self-assessment return. Most mortgage lenders require at least two years of SA302s, and some require three.',
              },
              {
                title: 'Tax Year Overview',
                body: 'The Tax Year Overview is a companion document to the SA302 that confirms the tax you owe has been paid. Many lenders require both documents together. It is available in the same section of HMRC online. Always download both at the same time.',
              },
              {
                title: 'Certified accounts from an accountant',
                body: 'If you use an accountant, a set of certified accounts (profit and loss statement) signed and stamped by your accountant carries significant weight with most lenders. The accounts should be prepared to the standard your industry uses. For complex income structures (e.g., a limited company director taking dividends), this is often more informative than the SA302 alone.',
              },
              {
                title: 'Bank statements (typically 3 to 6 months)',
                body: 'Most institutions will ask for bank statements alongside the formal documents. They want to see that the income shown on the SA302 actually arrived in your account and that your account is managed responsibly. Ensure your business and personal accounts tell a coherent story, and prepare to explain any large irregular deposits or withdrawals.',
              },
              {
                title: 'Client contracts or letters of engagement',
                body: 'For ongoing client relationships, contracts or letters confirming your engagement, the nature of the work and the payment terms can support your income picture. This is particularly relevant if you have one or two major clients whose work accounts for the majority of your income. It demonstrates continuity.',
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

          <h2 className="text-2xl font-bold text-cream pt-4">For rental applications specifically</h2>

          <p className="leading-relaxed text-cream">
            Letting agents and landlords are less standardised in what they accept than mortgage lenders. Most will ask for evidence of income equivalent to 2.5 times the monthly rent. For a self-employed applicant, the most practical package is: the most recent SA302, bank statements for the last three months, and a covering letter explaining the structure of your income. Some agents also accept accountant-provided income letters.
          </p>

          <p className="leading-relaxed text-cream">
            The variable nature of self-employment income can make landlords nervous regardless of the amount. If your income varies significantly month to month, frame the evidence in annual terms and show the pattern over multiple years. A contractor who earns £60,000 a year but does it in irregular monthly amounts needs to present a different picture from someone on a £5,000 monthly salary. Annual average income, shown consistently across two or three years, is more persuasive than any single month's figure.
          </p>

          <p className="leading-relaxed text-cream">
            A larger deposit, paid upfront, can sometimes substitute for an income presentation that makes a landlord uncomfortable. This is not fair, and it places a disproportionate burden on people who earn well but variably. It is nevertheless a practical lever if the alternative is being turned down.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">For mortgage applications</h2>

          <p className="leading-relaxed text-cream">
            Mortgage lenders for self-employed applicants typically use either the most recent year's net profit or an average of the last two years, whichever is lower. If your income has grown significantly, an average understates your current position. Some specialist lenders will consider the most recent year alone if the trajectory is strongly upward and you can document it.
          </p>

          <p className="leading-relaxed text-cream">
            For limited company directors, the calculation is more complex. Most lenders will assess your salary plus dividends (rather than company profit), and some will include director loans or other draws. The documentation required expands: company accounts, accountant certification, dividend vouchers, and evidence that retained profit exists if you are claiming it.
          </p>

          <p className="leading-relaxed text-cream">
            Specialist self-employed mortgage brokers are worth using in this context. They know which lenders are more flexible on specific income structures and can match you to a product without triggering multiple hard credit searches. The mainstream high street lenders are often the least flexible; specialist lenders often have better products for non-standard income.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">What open banking adds to the picture</h2>

          <p className="leading-relaxed text-cream">
            The fundamental limitation of the documents above is that they are backward-looking. SA302 is last year's income. Accounts are the previous financial year. Bank statements are three to six months old. None of them show what your income looks like right now.
          </p>

          <p className="leading-relaxed text-cream">
            Open banking data is current and continuous. A connection to your bank account shows the actual pattern of income arriving over time, including the last few weeks. For an institution willing to look at it, this is significantly more informative than a historical tax return. It also shows income stability across different time periods in a way that a single SA302 cannot capture.
          </p>

          <p className="leading-relaxed text-cream">
            The adoption of open banking-based income verification in mainstream mortgage lending is growing, but it is not yet universal. Specialist lenders and newer fintech providers are more likely to accept it than traditional high street banks. The direction of travel is clear: open banking is increasingly part of how income is verified, particularly for non-standard earners. Understanding what it can show and preparing your banking to reflect your actual income pattern is worth doing now.
          </p>

          <div className="rounded-xl border border-teal/20 bg-teal/5 px-6 py-5 my-6">
            <p className="text-sm font-medium text-teal mb-2">Practical tip: keep business and personal income clean</p>
            <p className="text-sm text-cream">
              If open banking data is going to be used to assess your income, the clearer your account is, the better. Regular transfers from a business account to a personal account, with consistent reference descriptions, are much easier to assess than a mix of client payments, ad hoc transfers and unclear deposits. This also makes your bank statements significantly easier to present to a landlord or lender.
            </p>
          </div>

        </div>
      </article>

      <section className="bg-ink py-12">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Related reading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { href: '/blog/gig-workers-financial-access', label: 'Why the gig economy leaves workers financially stranded' },
              { href: '/blog/open-banking-explained', label: 'Open banking explained: what it is and whether it is safe' },
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
            <h2 className="mb-3 text-2xl font-bold text-cream">Self-employed and tired of having to explain your income?</h2>
            <p className="mx-auto mb-7 max-w-md leading-relaxed text-cream">
              Equiscore builds a verified Trust Portfolio using open banking data, giving non-PAYE earners a structured, shareable record of their income pattern.
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
