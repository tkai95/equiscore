import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import { ArrowRight, Lock } from 'lucide-react'

export default function FinancialEquityCreditSystemPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-24">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/blog" className="text-xs font-semibold uppercase tracking-widest text-teal hover:text-teal/80">← Blog</Link>
          <span className="text-cream/20">·</span>
          <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">Policy & society</span>
          <span className="text-xs text-cream/40">May 2025</span>
          <span className="text-xs text-cream/40">10 min read</span>
        </div>
        <h1 className="mb-6 text-3xl font-bold leading-tight text-cream lg:text-4xl">
          The credit system was not designed for everyone. That was always the point.
        </h1>
        <p className="text-lg leading-relaxed text-cream/80">
          The UK credit infrastructure was built in the 1950s for a specific kind of person. The people it was not designed for are still paying the price. This is not a glitch. It is a structural feature. Understanding that matters if you want to do anything about it.
        </p>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-10">
        <div className="space-y-6">

          <p className="leading-relaxed text-cream">
            Credit scoring as we know it emerged in the mid-twentieth century. The logic was straightforward: if you want to assess whether someone will repay a loan, look at whether they have repaid loans in the past. Use that history to build a statistical model. Apply the model at scale. The credit file was born.
          </p>

          <p className="leading-relaxed text-cream">
            The model worked well for the population it was calibrated on: predominantly male, White, employed in stable jobs, living in settled communities, already using formal financial services. For that population, a credit history was a reasonable proxy for financial behaviour. The model became the standard.
          </p>

          <p className="leading-relaxed text-cream">
            It never stopped being calibrated on that population. The people outside that template, immigrants, gig workers, cash users, young people, people from communities historically excluded from formal finance, generate less of the training data. Their behaviour is less well represented in the models. The models are less good at assessing them. And so they get worse outcomes, which generates less data about them, which makes the models worse at assessing them. The cycle compounds over generations.
          </p>

          <div className="rounded-2xl border border-teal/20 bg-ink-mid p-8 my-8">
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">What the data shows</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { stat: '22%', label: 'of people from minority ethnic groups have experienced racial discrimination from financial providers', source: 'Fair4All Finance / Ipsos 2024' },
                { stat: '4x', label: 'more likely to be denied a loan if you are Black African compared to White', source: 'Fair4All Finance 2024' },
                { stat: '63%', label: 'of Black households have no savings, vs 33% of White households', source: 'Fair4All Finance 2024' },
                { stat: '£6.4bn', label: 'the annual economic gain from improving financial inclusion for minority ethnic communities', source: 'WPI Economics / Fair4All Finance' },
              ].map(({ stat, label, source }) => (
                <div key={stat} className="rounded-xl border border-ink-border bg-ink p-5">
                  <p className="mb-1 text-3xl font-bold text-teal">{stat}</p>
                  <p className="mb-2 text-sm text-cream">{label}</p>
                  <p className="text-xs text-cream/40">{source}</p>
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-cream pt-4">What Fair4All Finance found</h2>

          <p className="leading-relaxed text-cream">
            In October 2024, Fair4All Finance published "Levelling the Playing Field," the first large-scale UK study to directly quantify racial discrimination in financial services. The findings, commissioned from Ipsos with qualitative research from ClearView, were striking in their specificity.
          </p>

          <p className="leading-relaxed text-cream">
            22% of people from minority ethnic groups reported experiencing discrimination due to race when dealing with financial providers. Black African applicants were four times more likely to be denied a loan than White applicants. Black Caribbean applicants were 3.5 times more likely. These are not marginal statistical differences. They are consistent patterns across multiple products and multiple institutions.
          </p>

          <p className="leading-relaxed text-cream">
            The savings gap compounds the problem. 63% of Black households and 60% of Asian households have no savings, compared to 33% of White households. No savings means no buffer. No buffer means that any income disruption becomes a financial crisis. A financial crisis means missed payments. Missed payments damage the credit file. A damaged credit file means worse terms, higher costs and further barriers. The structural disadvantage reproduces itself at each step.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">Algorithmic bias: the regulator takes notice</h2>

          <p className="leading-relaxed text-cream">
            Until recently, the bias in credit scoring could be characterised as legacy: systems built on historical data that reflected historical inequality. The emerging concern is that the shift to AI and machine learning in lending decisions may be making this worse rather than better.
          </p>

          <p className="leading-relaxed text-cream">
            In December 2024, the FCA published its first research note specifically on bias in supervised machine learning applied to financial services. The document confirmed that "bias can lead to unfair or discriminatory outcomes particularly for protected or vulnerable groups," and identified data bias and representativeness as top-five risks in the sector. The Bank of England and FCA's 2024 AI survey found that 75% of UK financial services firms now use AI in their operations, up from 58% in 2022.
          </p>

          <p className="leading-relaxed text-cream">
            The concern is specific: if an AI model is trained on historical lending decisions, and those historical decisions contained racial and socioeconomic bias, the model will learn those biases. It will not call them racism. It will call them risk factors. The model will then apply those risk factors at scale, faster and at greater volume than any human decision-maker could. Automated discrimination is still discrimination. The FCA has committed to examining whether existing automated credit decisions are producing unfair outcomes and whether guidance is needed.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">The poverty premium</h2>

          <p className="leading-relaxed text-cream">
            Financial exclusion is expensive. This is known colloquially as the poverty premium: the phenomenon whereby lower-income households pay more for the same products than higher-income ones. It operates through multiple mechanisms.
          </p>

          <p className="leading-relaxed text-cream">
            If you cannot access mainstream credit, you borrow from higher-cost lenders. If you cannot access standard insurance products because of postcode-based pricing, you pay more or go without. If you cannot open a standard bank account because of a fraud marker or a thin file, you use cash or prepaid cards, which carry transaction costs and exclude you from digital financial services.
          </p>

          <p className="leading-relaxed text-cream">
            Research by Responsible Finance found that 70% of UK adults consider it unfair for postcode to negatively affect a credit score. 55% consider thin-file penalisation unfair. But awareness of unfairness and systemic change are different things. The system continues to operate as designed because it has not been substantially updated to reflect the diversity of the population it assesses.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">The 26 million people showing vulnerability characteristics</h2>

          <p className="leading-relaxed text-cream">
            The FCA's Financial Lives 2024 survey found that 26.4 million UK adults, 49% of all adults, show at least one characteristic of vulnerability. These include low financial resilience, poor health, significant life events such as bereavement or divorce, and low financial capability. The FCA's vulnerability guidance requires firms to identify and serve vulnerable customers fairly. The evidence suggests most firms are not doing this consistently.
          </p>

          <p className="leading-relaxed text-cream">
            Vulnerability and financial exclusion are not identical, but they overlap substantially. The people most likely to face credit barriers are disproportionately represented among the 49%: lower-income, older, from ethnic minority backgrounds, recently experienced financial disruption. The credit system interacts with vulnerability in ways that most assessments do not account for.
          </p>

          <h2 className="text-2xl font-bold text-cream pt-4">What this means for what comes next</h2>

          <p className="leading-relaxed text-cream">
            WPI Economics estimated in 2024 that improving financial inclusion for minority ethnic communities alone could add £6.4 billion per year to the UK economy. That is not a soft number about fairness. It is an economic argument for changing the infrastructure.
          </p>

          <p className="leading-relaxed text-cream">
            The trajectory of change is slow. Credit reference agency data sharing initiatives and FCA regulatory pressure are moving in the right direction. But slow change is experienced as no change by the individuals currently navigating a system that cannot see them accurately.
          </p>

          <p className="leading-relaxed text-cream">
            The infrastructure gap, between the financial behaviour that exists and the evidence the system can access, is where the most immediate work is possible. Not waiting for a generation of policy change to filter through, but building tools that make a person's actual financial behaviour legible to the institutions that need to make decisions about them, now.
          </p>

          <p className="leading-relaxed text-cream">
            That is not a substitute for systemic reform. The credit system's structural bias deserves the policy attention it is beginning to receive. But for someone trying to rent a flat or open a bank account in 2025, structural reform is not the relevant timeline.
          </p>

        </div>
      </article>

      <section className="bg-ink py-12">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">Related reading</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { href: '/blog/thin-credit-file', label: 'What is a thin credit file and why does it lock people out' },
              { href: '/blog/migrants-uk-financial-system', label: 'How the UK system fails migrants' },
              { href: '/mission', label: 'Our mission: why we built Equiscore' },
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
            <h2 className="mb-3 text-2xl font-bold text-cream">The system cannot see you. We are building something that can.</h2>
            <p className="mx-auto mb-7 max-w-md leading-relaxed text-cream">
              Equiscore builds a verified Trust Portfolio from your real financial behaviour. No credit history required. Join the waitlist for early access.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {showWaitlist ? (
                <RegisterInterestButton label="Join the waitlist" variant="primary" />
              ) : (
                <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-3.5 text-base font-semibold text-ink hover:bg-teal-dark">
                  Build my profile <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link href="/mission" className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-7 py-3.5 text-base font-semibold text-cream hover:border-cream/40">
                Our mission <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
