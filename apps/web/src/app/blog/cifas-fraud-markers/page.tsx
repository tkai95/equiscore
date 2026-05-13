import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import { ArrowRight, Lock } from 'lucide-react'

export default function CifasFraudMarkersPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Article header ───────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-10 pt-24">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/blog" className="text-xs font-semibold uppercase tracking-widest text-teal hover:text-teal/80">
            ← Blog
          </Link>
          <span className="text-cream/20">·</span>
          <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">Financial exclusion</span>
          <span className="text-xs text-cream/40">May 2025</span>
          <span className="text-xs text-cream/40">9 min read</span>
        </div>
        <h1 className="mb-6 text-3xl font-bold leading-tight text-cream lg:text-4xl">
          The problem with CIFAS fraud markers: who gets flagged and why the system fails them
        </h1>
        <p className="text-lg leading-relaxed text-cream/80">
          According to CIFAS Fraudscape 2025, 421,000 fraud cases were filed to the UK's National Fraud Database in 2024 — the highest number ever recorded, and a case filed every two minutes. Many of the people behind those markers are not fraudsters. They are young people who were manipulated, victims of identity theft, and ordinary people who never knew a case had been filed against them at all.
        </p>
      </section>

      {/* ── Article body ─────────────────────────────────────────── */}
      <article className="mx-auto max-w-3xl px-6 pb-10">

        <div className="prose-article space-y-6">

          <p className="text-lg leading-relaxed text-cream">
            CIFAS is the UK's national fraud prevention service. It was established in 1988 and now has more than 680 member organisations, including virtually every major bank, most lenders, most insurers, the majority of letting agents and a growing number of employers. When a CIFAS member suspects fraud, they file a case against the individual's details. That case is then visible to every other CIFAS member.
          </p>

          <p className="leading-relaxed text-cream">
            A marker typically remains on the database for six years. During that time, most members will decline your application automatically, without ever telling you that a CIFAS record is the reason. You may receive a vague rejection letter. You may receive nothing. The system does not require them to explain.
          </p>

          {/* Stats callout */}
          <div className="rounded-2xl border border-teal/20 bg-ink-mid p-8 my-8">
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">CIFAS in numbers</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { stat: '421,000+', label: 'fraud cases filed to the National Fraud Database in 2024', source: 'CIFAS Fraudscape 2025' },
                { stat: '680+', label: 'member organisations checking CIFAS before deciding on you', source: 'CIFAS membership data' },
                { stat: '6 years', label: 'how long a standard marker stays on the database', source: 'CIFAS retention policy' },
              ].map(({ stat, label, source }) => (
                <div key={stat} className="rounded-xl border border-ink-border bg-ink p-5 text-center">
                  <p className="mb-1 text-3xl font-bold text-teal">{stat}</p>
                  <p className="mb-2 text-sm text-cream">{label}</p>
                  <p className="text-xs text-cream/40">{source}</p>
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">The types of markers and what they mean</h2>

          <p className="leading-relaxed text-cream">
            CIFAS markers are not all the same. The database categorises cases by type, and understanding the difference matters both for challenging a marker and for understanding why it was filed.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">Misuse of Facility</strong> is the most common category. It covers situations where an account, product or service was used in a way that breaches the terms. This is the marker most commonly associated with money mule activity: someone used their account to receive or move money linked to criminal activity. Critically, this category applies regardless of whether the account holder knew what was happening or not.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">Fraud by False Representation</strong> covers lying on applications: inflating income on a mortgage application, providing false employment details, misrepresenting your situation. This one is more clearly deliberate.
          </p>

          <p className="leading-relaxed text-cream">
            <strong className="text-cream font-semibold">Facility Takeover</strong> is actually filed when someone else takes control of your account, making the victim the named subject. People who have had their accounts hijacked by third parties have ended up on CIFAS as the subject of a fraud case, rather than being treated as a victim of one.
          </p>

          {/* Callout box */}
          <div className="rounded-xl border border-teal/20 bg-teal/5 px-6 py-5 my-6">
            <p className="text-sm text-teal font-medium mb-2">Important</p>
            <p className="text-sm text-cream">
              Having a CIFAS marker does not mean you committed fraud. It means a CIFAS member organisation filed a case against your details. These are not court findings. They are risk assessments made by individual organisations, and they can be wrong.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">The money mule problem</h2>

          <p className="leading-relaxed text-cream">
            The fastest-growing category of CIFAS case in recent years is money mule recruitment, and the demographics are stark. According to CIFAS Fraudscape 2025, under-30s accounted for 61% of all money mule cases in 2024. Thousands of people in this age group are flagged every year, many of them for activity they did not fully understand when it happened.
          </p>

          <p className="leading-relaxed text-cream">
            The typical story is familiar. Someone is approached by a person they know, or contacted online, and asked to receive money into their account and transfer it on. They are told it is for a legitimate purpose. A business that needs a quick transfer. A friend with a frozen account. An online relationship. They agree without understanding what they are getting into, the money moves through, and some weeks or months later their account is closed with no explanation.
          </p>

          <p className="leading-relaxed text-cream">
            The bank has filed a CIFAS case. The marker is now on the database. The person did not profit. In many cases they were themselves a victim of a scam. The CIFAS system treats them the same as an organised fraudster.
          </p>

          <p className="leading-relaxed text-cream">
            Research from Cifas itself has acknowledged this issue. Their fraud reports consistently note that many mule recruits are "victims who were exploited rather than willing participants." The database does not have a category for that distinction.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Who is most affected</h2>

          <p className="leading-relaxed text-cream">
            The impact of a CIFAS marker is not spread evenly across the population. The people most likely to end up with a marker are disproportionately young, from lower-income backgrounds, and from communities with less financial literacy or less experience of formal banking.
          </p>

          <p className="leading-relaxed text-cream">
            Research by Cifas and independent academics has found consistent patterns. Young people are more likely to be recruited as money mules because they are more likely to be targeted by recruitment methods that work online: social media approaches, romantic scams, job offers with suspicious payment structures. Communities with less access to financial education are less likely to recognise a mule recruitment attempt for what it is before agreeing to it.
          </p>

          <p className="leading-relaxed text-cream">
            Immigrants are also overrepresented. Arriving in a new country with limited knowledge of the banking system, under financial pressure, and sometimes targeted specifically because of their unfamiliarity with how UK fraud prevention works.
          </p>

          <p className="leading-relaxed text-cream">
            The six-year marker lands on people who are already more financially vulnerable than average. It then takes away bank accounts, rental applications, employment in regulated industries, access to credit, phone contracts on standard terms. It compounds an existing disadvantage rather than applying pressure to those most able to absorb it.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">What a marker actually blocks</h2>

          <p className="leading-relaxed text-cream">
            The reach of CIFAS is wider than most people realise until they try to do something and get rejected. Every major high street bank is a member. Most mortgage lenders. Most insurers. A large and growing number of letting agents, landlords and employers in regulated industries. The 680+ member count understates the actual reach because each member may use CIFAS data across all of their products and subsidiaries.
          </p>

          <p className="leading-relaxed text-cream">
            Practically, a CIFAS marker means: almost no chance of a standard bank account at a high street bank; significant difficulty renting privately; barriers to employment in finance, the public sector, and any regulated role requiring a financial background check; rejections from most standard credit products; refusals or large deposits demanded for utility accounts.
          </p>

          <p className="leading-relaxed text-cream">
            You may be able to open a basic bank account with some providers. Basic accounts are a legal requirement under the Payment Accounts Regulations 2015, and some providers are more willing than others to look at applications from people with fraud markers. But the standard financial services most people take for granted are largely closed.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">The absence of a rehabilitation framework</h2>

          <p className="leading-relaxed text-cream">
            Criminal convictions in the UK have rehabilitation periods. Spent convictions do not have to be disclosed after a certain time. The Rehabilitation of Offenders Act 1974 exists precisely because society acknowledged that permanent punishment was neither just nor useful.
          </p>

          <p className="leading-relaxed text-cream">
            CIFAS markers have no equivalent. The database does not distinguish between a person involved in organised fraud as a willing participant and a nineteen-year-old who was duped into receiving a transfer. Both receive a six-year marker. Neither has any formal mechanism to demonstrate rehabilitation. The system has no concept of rehabilitation.
          </p>

          <p className="leading-relaxed text-cream">
            You can challenge a marker through CIFAS's own complaints process. If they do not uphold your challenge, you can escalate to the Information Commissioner's Office (ICO) or pursue the matter through the courts. These routes exist in principle. In practice, they are difficult, slow, and require documentation most people do not have. The burden of proof rests entirely on the person who was flagged.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">What the Financial Ombudsman found</h2>

          <p className="leading-relaxed text-cream">
            The Financial Ombudsman Service upholds around 31% of CIFAS-related complaints brought against financial institutions. That figure tells you two things: a meaningful share of markers that reach the FOS were not placed correctly, and the institutions that placed them did not expect to be challenged.
          </p>

          <p className="leading-relaxed text-cream">
            In one published decision (reference DRN-3428367), the FOS found that Monzo had closed a customer's account and registered a CIFAS marker against her without making any inquiries with her first. She had been contacted on social media by someone who asked her to facilitate some transfers. The FOS concluded she was almost certainly an unwitting participant and directed Monzo to remove the marker. The FOS has stated explicitly: "CIFAS markers can have severe effects and must not be added without serious consideration."
          </p>

          <p className="leading-relaxed text-cream">
            A Which? investigation found multiple similar cases: people whose markers were removed on review because the institution had "failed to consider if the customer was themselves the victim of an attempted identity theft or fraud." In several cases, banks were directed to remove markers and pay compensation. The markers had been in place for months or years before anyone looked at them seriously.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">What needs to change</h2>

          <p className="leading-relaxed text-cream">
            The UK Treasury Committee has published reports on financial exclusion and de-banking that touch on CIFAS. The FCA's ongoing work on access to financial services acknowledges the problem. But systemic change is slow, and millions of people are navigating the consequences of a system that has not caught up with the reality of who gets caught by it.
          </p>

          <p className="leading-relaxed text-cream">
            There is no quick fix for this. The CIFAS database serves a genuine purpose: fraud costs the UK economy billions of pounds a year, and a shared fraud prevention database is a rational response. The problem is not the existence of the database. It is the absence of nuance, the lack of a rehabilitation pathway, and the automatic, unexplained application of a marker's consequences across every area of a person's financial life for six years.
          </p>

          <p className="leading-relaxed text-cream">
            Until that changes, the practical question for most people with a marker is: what can you actually do? How do you prove that your current financial behaviour is not what happened then? How do you build a record that institutions can use when the standard credit infrastructure is closed to you?
          </p>

          <p className="leading-relaxed text-cream">
            That is the problem Equiscore is working on. Not a policy fix, but a practical infrastructure layer that lets people build and share verified evidence of their current financial behaviour, separate from what the fraud prevention databases say about the past.
          </p>

        </div>
      </article>

      {/* ── Related articles ─────────────────────────────────────── */}
      <section className="bg-ink py-12">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Related reading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { href: '/blog/how-to-check-your-cifas-record', label: 'How to check and challenge your CIFAS record' },
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

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-ink pb-28 pt-4">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-8 py-12 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
              <Lock className="h-5 w-5 text-teal" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-cream">
              Dealing with a CIFAS marker or account closure?
            </h2>
            <p className="mx-auto mb-7 max-w-md leading-relaxed text-cream">
              Equiscore is being built to help people in exactly this situation build a verified record of their current financial behaviour.
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
