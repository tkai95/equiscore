import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import {
  ArrowRight,
  ShieldCheck,
  Globe,
  Briefcase,
  User,
  Lock,
} from 'lucide-react'

const WHO_WE_BUILT_FOR = [
  {
    icon: ShieldCheck,
    label: 'People flagged for fraud they did not commit',
    body: 'A CIFAS marker follows you for six years. It blocks bank accounts, rental applications, employment checks and credit. There is no formal appeals process and no way to demonstrate rehabilitation. The system simply waits you out.',
  },
  {
    icon: Globe,
    label: 'Migrants who arrive with nothing on file',
    body: 'You may have an excellent financial record in another country. Years of on-time payments, a mortgage, verifiable savings. The UK credit system has no mechanism to look for it. You arrive with a blank file and institutions treat that the same as a bad one.',
  },
  {
    icon: Briefcase,
    label: 'Gig workers and the self-employed',
    body: "The credit system was built around permanent employment and monthly salaries. If you earn well but irregularly, you are assessed on a single month's payslip rather than a year's real income. The system penalises how you work, not whether you are reliable.",
  },
  {
    icon: User,
    label: 'People with thin or no credit file',
    body: 'Around 4 to 5 million UK adults have a credit file so thin it effectively does not exist. Young people, people who pay everything in cash, people who have always managed their money quietly and responsibly. The system cannot see them, so it turns them away.',
  },
]

export default function MissionPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Our mission</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          Financial access should not depend
          <br />
          <span className="text-teal">on being easy to score.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-cream">
          Millions of people in the UK are financially responsible. They pay their rent. They manage their money carefully. They have never defaulted on anything in their lives. And the financial system cannot see them at all.
        </p>
      </section>

      {/* ── The problem ──────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The problem we are solving</p>
          <h2 className="mb-10 text-center text-3xl font-bold text-cream">
            The system was not built for everyone. That is not an accident. But it does not have to stay that way.
          </h2>
          <div className="space-y-6">
            <p className="text-lg leading-relaxed text-cream">
              The UK credit infrastructure was designed in the 1950s and 1960s for a very specific type of person: employed, settled, buying a house, using credit regularly, living in the same place for years. That model worked well for the people it was designed for.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              It does not work for millions of people whose financial lives do not fit that template. Not because they are irresponsible. Not because they are a risk. But because the system was never designed to look for evidence that does not match its original assumptions.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              The result is a large group of people who are functionally excluded from financial services, not because of anything they have done, but because the infrastructure cannot process who they are.
            </p>
            <p className="text-xl font-semibold text-cream">
              That is the gap Equiscore was built to close.
            </p>
          </div>
        </div>
      </section>

      {/* ── Who we built this for ────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Who we built this for</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Four groups. Millions of people. One shared problem.
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            The specific circumstances are different. The outcome is always the same: a system that cannot see your financial reality and defaults to no.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {WHO_WE_BUILT_FOR.map(({ icon: Icon, label, body }) => (
              <div key={label} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="mb-2 font-semibold text-cream">{label}</h3>
                <p className="text-sm leading-relaxed text-cream">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What we believe ──────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-teal/20 bg-ink-mid p-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">What we believe</p>
            <h2 className="mb-8 text-2xl font-bold text-cream">
              Verified evidence is more honest than a credit score built on absence.
            </h2>
            <div className="space-y-5">
              <p className="leading-relaxed text-cream">
                A credit score is not a measure of financial character. It is a measure of how much credit you have used and how well you managed it. If you have never used credit, or if your credit history exists somewhere the system cannot reach, you score zero by default.
              </p>
              <p className="leading-relaxed text-cream">
                But real financial behaviour is not invisible. It is there in your bank statements. It is in the rent you have paid every month without fail. It is in the bills you clear, the savings you build, the income that arrives consistently even if it does not come from a single employer with a standard payroll.
              </p>
              <p className="leading-relaxed text-cream">
                We believe that verified evidence of real financial behaviour is more honest, and more useful, than a score built on what the system happens to have on file. And we believe the institutions that make decisions about people's access to housing, banking and credit deserve better evidence to work with.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How we approach this ─────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">How we approach this</p>
          <h2 className="mb-10 text-center text-3xl font-bold text-cream">
            Not a charity. Not a workaround. A proper infrastructure layer.
          </h2>
          <div className="space-y-6">
            <p className="text-lg leading-relaxed text-cream">
              Equiscore is not a campaign or a policy paper. It is a product. A piece of financial infrastructure that builds a verified, portable record of a person's real financial behaviour and makes it usable by the institutions that need to make decisions.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              We work with regulated open banking infrastructure to access real transaction data. We verify identity rigorously. We structure the output in a way that is meaningful to the banks, landlords and lenders who receive it. The Trust Portfolio has to work for both sides or it does not work at all.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              This is not about lowering standards. It is about bringing more honest evidence into a system that currently relies on incomplete information and makes worse decisions as a result. Fairer access and better risk assessment are not in tension. They are the same thing.
            </p>
          </div>
        </div>
      </section>

      {/* ── The long game ────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-10 py-14 text-center">
            <p className="mx-auto mb-6 max-w-2xl text-3xl font-bold leading-snug text-cream lg:text-4xl">
              The goal is not to help people game the system. It is to make the system better at seeing them.
            </p>
            <p className="mx-auto mb-6 max-w-xl text-lg leading-relaxed text-cream">
              Every Trust Portfolio built on Equiscore is a piece of evidence that the current infrastructure is missing. Over time, that evidence base changes what institutions can see and how they make decisions.
            </p>
            <p className="mx-auto max-w-xl font-semibold text-teal">
              That is the long-term mission: not a tool for individuals to navigate a broken system, but a layer of infrastructure that makes the system less broken.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-ink pb-28 pt-10">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-ink-border bg-ink-mid px-8 py-14 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
              <Lock className="h-6 w-6 text-teal" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-cream">
              If this is built for you, build your profile.
            </h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-cream">
              Register for early access and be among the first to build a Trust Portfolio when we launch.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {showWaitlist ? (
                <RegisterInterestButton label="Join the waitlist" variant="primary" />
              ) : (
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal px-8 py-4 text-base font-semibold text-ink shadow-[0_0_24px_rgba(0,200,150,0.3)] transition-all hover:bg-teal-dark"
                >
                  Build my profile <ArrowRight className="h-5 w-5" />
                </Link>
              )}
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-8 py-4 text-base font-semibold text-cream transition-colors hover:border-cream/40"
              >
                How it works <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
