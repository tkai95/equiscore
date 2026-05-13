import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import { ArrowRight, Lock } from 'lucide-react'

export default function BankAccountClosedWhatToDoPage() {
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
          Your bank account has been closed: what to do next
        </h1>
        <p className="text-lg leading-relaxed text-cream/80">
          Banks close accounts every day in the UK. You are rarely told the real reason. This guide explains how to find out what happened, whether a fraud marker is involved, and the practical steps you can take to get back on your feet.
        </p>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-10">
        <div className="space-y-6">

          <h2 className="text-2xl font-bold text-cream">Why banks close accounts without explanation</h2>

          <p className="leading-relaxed text-cream">
            Banks are not legally required to tell you why they are closing your account. Under the Payment Services Regulations 2017, a bank must give you two months notice before closing an account, except in cases where they suspect fraud or a legal obligation requires immediate action. In those cases, the account can be closed immediately and the reason does not have to be disclosed.
          </p>

          <p className="leading-relaxed text-cream">
            The most common reasons accounts are closed are: a CIFAS fraud marker being filed against your details (by this or another institution); your account being flagged by automated transaction monitoring systems; a commercial decision to exit you as a customer; or the bank's own compliance systems detecting a match with a financial sanctions list or a watchlist.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 1: Check your CIFAS file immediately</h2>

          <p className="leading-relaxed text-cream">
            The first thing to do after an unexplained account closure is to check whether a CIFAS marker has been placed against your details. You can do this for free via a Subject Access Request to CIFAS at cifas.org.uk. They must respond within 30 days.
          </p>

          <p className="leading-relaxed text-cream">
            If a marker exists, you will see which organisation filed it and what type it is. This is the foundation of everything that follows. If no CIFAS marker exists, the closure was likely a commercial or compliance decision, which has different implications.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 2: Request the reason in writing</h2>

          <p className="leading-relaxed text-cream">
            Write to the bank and formally request the reason for the closure. Banks are not required to give you the full reason, but under UK GDPR you have the right to request a Subject Access Report showing all personal data they hold about you, including any notes on your account and the basis on which decisions were made.
          </p>

          <p className="leading-relaxed text-cream">
            Submit a SAR to the bank directly. This is free and they must respond within 30 days. The data you receive may not spell out the decision in plain language, but it will often contain account notes, compliance flags or risk classification codes that give you a clearer picture of what triggered the closure.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 3: Open a basic bank account as a priority</h2>

          <p className="leading-relaxed text-cream">
            Before doing anything else, make sure you have access to a functioning bank account. Under the Payment Accounts Regulations 2015, the nine largest UK banks are required to offer a basic bank account to anyone legally resident in the UK, regardless of credit history or CIFAS status. You cannot be refused a basic account purely because of a fraud marker.
          </p>

          <p className="leading-relaxed text-cream">
            Basic accounts provide the core functionality you need: a sort code and account number, ability to receive wages and benefits, debit card, direct debit capability and access to cash. They are not full current accounts, but they restore financial access while you resolve the underlying issue.
          </p>

          <div className="rounded-xl border border-teal/20 bg-teal/5 px-6 py-5 my-6">
            <p className="text-sm font-medium text-teal mb-2">If a bank refuses to open a basic account</p>
            <p className="text-sm text-cream">
              If a designated bank refuses to open a basic account without a valid reason, you can escalate to the Financial Ombudsman Service. Refusing a basic account to someone legally resident in the UK, without lawful justification, is a breach of the Payment Accounts Regulations.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 4: Understand what else may be affected</h2>

          <p className="leading-relaxed text-cream">
            An account closure with a CIFAS marker behind it does not only affect bank accounts. Because 680+ organisations check the CIFAS database, the same marker will affect: credit and loan applications, private rental applications (many letting agents check CIFAS), employment in financial services and regulated industries, phone contracts on standard terms, and insurance applications.
          </p>

          <p className="leading-relaxed text-cream">
            Understanding the full scope of what is affected helps you prioritise. If you are in the middle of a rental application or a job application for a regulated role, those timelines matter. Address the most urgent first.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 5: Challenge the marker if it is incorrect</h2>

          <p className="leading-relaxed text-cream">
            If the closure was linked to a CIFAS marker and you believe it was placed incorrectly, contact the filing organisation and request a review. Set out clearly what happened, why you believe the marker is wrong, and what evidence you have. The Financial Ombudsman Service upholds around 31% of CIFAS-related complaints, suggesting a meaningful number of markers are placed without adequate investigation.
          </p>

          <p className="leading-relaxed text-cream">
            If the organisation does not resolve the complaint, escalate to CIFAS directly, then to the Financial Ombudsman or the Information Commissioner's Office. Our separate guide on checking and challenging your CIFAS record covers this process in detail.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 6: Start building a verified financial record</h2>

          <p className="leading-relaxed text-cream">
            Whether or not you are challenging a marker, building a verified record of your current financial behaviour is worth starting immediately. The challenge process can take months. During that time, you are still trying to open accounts, apply for housing, and manage your financial life. Evidence of responsible financial behaviour in the period after a closure is both practically useful and relevant to any formal challenge.
          </p>

          <p className="leading-relaxed text-cream">
            Open banking data, used through a service like Equiscore, generates a verifiable record of income regularity, bill payments and account management over time. It does not require a credit history to start. Every month of verified behaviour is evidence that the situation now is not defined by what happened then.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">If the closure was not CIFAS-related</h2>

          <p className="leading-relaxed text-cream">
            If your SAR comes back with no CIFAS marker, the closure was likely a commercial or compliance decision: the bank exiting a type of customer, a regulatory compliance flag, or an automated system decision. These are harder to challenge directly because banks have broad discretion over who they serve.
          </p>

          <p className="leading-relaxed text-cream">
            The most productive approach is usually to move your banking to a different provider and focus on establishing your financial record with the new institution. Some providers are more willing than others to serve customers who have had accounts closed elsewhere. Specialist banks and building societies often take a more considered approach to account applications from people with complicated histories.
          </p>

        </div>
      </article>

      <section className="bg-ink py-12">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Related reading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { href: '/blog/cifas-fraud-markers', label: 'The problem with CIFAS fraud markers: who gets flagged' },
              { href: '/blog/how-to-check-your-cifas-record', label: 'How to check and challenge your CIFAS record' },
              { href: '/for/account-closed', label: 'How Equiscore helps people with account closures' },
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
            <h2 className="mb-3 text-2xl font-bold text-cream">Account closed? Start building evidence of who you are now.</h2>
            <p className="mx-auto mb-7 max-w-md leading-relaxed text-cream">
              Equiscore gives people in exactly this situation a way to build and share verified evidence of their current financial behaviour.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isPublicSite ? (
                <RegisterInterestButton label="Join the waitlist" variant="primary" />
              ) : (
                <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-3.5 text-base font-semibold text-ink hover:bg-teal-dark">
                  Build my profile <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link href="/for/account-closed" className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-7 py-3.5 text-base font-semibold text-cream hover:border-cream/40">
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
