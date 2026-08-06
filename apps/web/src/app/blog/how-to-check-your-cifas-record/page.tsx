import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import { ArrowRight, Lock } from 'lucide-react'

export default function HowToCheckCifasRecordPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-24">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/blog" className="text-xs font-semibold uppercase tracking-widest text-teal hover:text-teal/80">← Blog</Link>
          <span className="text-cream/20">·</span>
          <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">Practical guides</span>
          <span className="text-xs text-cream/40">May 2025</span>
          <span className="text-xs text-cream/40">6 min read</span>
        </div>
        <h1 className="mb-6 text-3xl font-bold leading-tight text-cream lg:text-4xl">
          How to check and challenge your CIFAS record in the UK
        </h1>
        <p className="text-lg leading-relaxed text-cream/80">
          You have a legal right to see your CIFAS file at any time. Most people never exercise it because they do not know it exists. This is a step-by-step guide to what to request, how to read it, and what you can do if there is a marker on it.
        </p>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-10">
        <div className="space-y-6">

          <h2 className="text-2xl font-bold text-cream">First: understand what CIFAS holds</h2>

          <p className="leading-relaxed text-cream">
            CIFAS operates two main databases. The <strong className="text-cream font-semibold">National Fraud Database (NFD)</strong> holds cases filed by member organisations when they believe fraud has occurred. The <strong className="text-cream font-semibold">Protective Registration</strong> database holds records filed by individuals to protect themselves against identity fraud (you file this one yourself, voluntarily, if you think someone has stolen your identity).
          </p>

          <p className="leading-relaxed text-cream">
            You can hold a record on both, and checking them requires separate requests. Most people are concerned about the NFD, because that is where markers placed against you by banks and lenders sit.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 1: Request your Subject Access Report</h2>

          <p className="leading-relaxed text-cream">
            Under UK GDPR, you have the right to request a copy of all personal data an organisation holds about you. CIFAS offers a Subject Access Request (SAR) service specifically for this.
          </p>

          <div className="space-y-3 my-6">
            {[
              { n: '1', text: 'Go to cifas.org.uk and navigate to the Subject Access Request section.' },
              { n: '2', text: 'Complete the online form with your personal details: full name, date of birth, current and previous addresses for the last six years.' },
              { n: '3', text: 'Submit proof of identity. Acceptable documents include a passport, driving licence or recent utility bill. CIFAS will specify the exact requirements on the form.' },
              { n: '4', text: 'There is no fee. The request is free under GDPR. CIFAS is legally required to respond within 30 days.' },
              { n: '5', text: 'You will receive a report detailing any records held against your details.' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-4 rounded-xl border border-ink-border bg-ink-mid p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-ink">{n}</div>
                <p className="text-sm leading-relaxed text-cream">{text}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 2: Read the report</h2>

          <p className="leading-relaxed text-cream">
            The report will tell you whether any cases are held against your details and, if so: the filing organisation, the type of marker (e.g., Misuse of Facility, Fraud by False Representation), the date the case was filed, and how long it is due to remain.
          </p>

          <p className="leading-relaxed text-cream">
            If the report comes back clear, you have no active CIFAS markers. If it shows a case, note the type and the filing organisation. You will need this information for any challenge.
          </p>

          <div className="rounded-xl border border-teal/20 bg-teal/5 px-6 py-5 my-6">
            <p className="text-sm font-medium text-teal mb-2">How long do markers last?</p>
            <p className="text-sm text-cream">
              Standard NFD markers last up to 6 years from the date of filing. Protective Registration lasts 2 years (renewable). Victim of Impersonation markers last 13 months. The specific retention period should be shown on your report.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 3: If there is a marker, contact the filing organisation first</h2>

          <p className="leading-relaxed text-cream">
            CIFAS itself does not file markers. Individual member organisations file them. Your first step in challenging a marker is to contact the organisation that filed it and request an explanation under GDPR. Ask specifically: what information was used to reach the decision; what right of review or appeal exists; and what evidence would be needed to support a challenge.
          </p>

          <p className="leading-relaxed text-cream">
            Some organisations will review the case on request and, if they find the marker was placed incorrectly, will remove it themselves. The Financial Ombudsman Service has found in multiple cases that banks placed markers without making adequate inquiries first, and has directed removal. Starting with the organisation gives them the opportunity to correct this without escalation.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 4: Escalate to CIFAS's complaint process</h2>

          <p className="leading-relaxed text-cream">
            If the filing organisation does not resolve your complaint, you can raise a formal complaint with CIFAS directly. Set out your case clearly: what happened, why you believe the marker is incorrect, and what evidence you have. Include any correspondence with the filing organisation.
          </p>

          <p className="leading-relaxed text-cream">
            CIFAS will review the case with the filing member. If they uphold your complaint, the marker will be removed or amended. If they do not, they will explain the basis for that decision and inform you of your further rights.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Step 5: Escalate to the ICO or Financial Ombudsman</h2>

          <p className="leading-relaxed text-cream">
            If the CIFAS complaint process does not resolve your case, you have two further routes. The Information Commissioner's Office (ICO) oversees data protection rights and can investigate whether CIFAS or the filing organisation has complied with UK GDPR in processing your data. A complaint to the ICO is free.
          </p>

          <p className="leading-relaxed text-cream">
            The Financial Ombudsman Service (FOS) can review complaints against the financial institutions that are CIFAS members, in relation to the impact of a marker on your account or application. The FOS upholds around 31% of CIFAS-related complaints that reach it. If the FOS finds the marker was incorrectly placed, it can direct the institution to remove it and pay compensation.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">What to document throughout</h2>

          <p className="leading-relaxed text-cream">
            Keep records of everything from the start: the date of your SAR, the report you receive, every letter or email with the filing organisation, the dates of any calls (and what was said). Challenge processes can take months. Documentation is the difference between a case you can pursue and one you cannot.
          </p>

          <p className="leading-relaxed text-cream">
            If the marker was placed because your account was used to receive or move money by a third party, gather any evidence you have of the circumstances: messages, emails, anything that establishes you were acting without full knowledge of what was happening. The FOS has found in multiple cases that institutions failed to consider whether an account holder was themselves a victim before filing a marker.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">While you are challenging</h2>

          <p className="leading-relaxed text-cream">
            A challenge can take months, and a marker remains active during that time. Practically, you may want to look at basic bank account options (required to be offered by the nine largest banks regardless of CIFAS status), credit union membership, and any providers specifically willing to consider applications from people with fraud markers and a supporting explanation.
          </p>

          <p className="leading-relaxed text-cream">
            Building verified evidence of your current financial behaviour is also worth starting now. A record that shows responsible financial management in the period since the marker was placed is relevant both for institutions making decisions today and for any formal review of the marker itself. The more evidence you can show of your current behaviour, the stronger your position.
          </p>

        </div>
      </article>

      <section className="bg-ink py-12">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Related reading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { href: '/blog/cifas-fraud-markers', label: 'The problem with CIFAS fraud markers: who gets flagged' },
              { href: '/blog/bank-account-closed-what-to-do', label: 'Your bank account has been closed: what to do next' },
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
            <h2 className="mb-3 text-2xl font-bold text-cream">Build a record that shows who you are now</h2>
            <p className="mx-auto mb-7 max-w-md leading-relaxed text-cream">
              Equiscore helps people with account closures and fraud markers build a verified Trust Portfolio that institutions can rely on.
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
