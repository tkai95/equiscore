import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { showWaitlist } from "@/lib/site"
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
  FileText,
  Share2,
  Eye,
  TrendingUp,
} from 'lucide-react'

const TIERS = [
  { grade: 'A', label: 'Excellent', color: 'border-teal text-teal', bg: 'bg-teal/10', desc: 'Strong, consistent financial behaviour across all verified evidence categories.' },
  { grade: 'B', label: 'Good', color: 'border-teal/70 text-teal', bg: 'bg-teal/8', desc: 'Solid profile with minor gaps. Most providers will view this positively.' },
  { grade: 'C', label: 'Fair', color: 'border-sand text-sand', bg: 'bg-sand/10', desc: 'Reasonable behaviour with some inconsistency. Clear areas for improvement.' },
  { grade: 'D', label: 'Building', color: 'border-sand/70 text-sand/80', bg: 'bg-sand/8', desc: 'Early stage profile or limited data. Progress visible and tracked over time.' },
  { grade: 'E', label: 'Starting out', color: 'border-cream/30 text-cream/60', bg: 'bg-cream/5', desc: 'New to the platform or significant gaps in evidence. A starting point, not a verdict.' },
]

const MODULES = [
  { icon: ShieldCheck, label: 'Open Banking', desc: 'Verified income, regular outgoings and spending patterns pulled directly from your connected bank account.' },
  { icon: TrendingUp, label: 'Income Stability', desc: 'Consistency of income over time, including variable and self-employed earnings the traditional system cannot see.' },
  { icon: FileText, label: 'Identity', desc: 'Verified identity documentation, confirmed through our secure onboarding process.' },
  { icon: CheckCircle2, label: 'Rent & Bills', desc: 'Evidence of regular payment behaviour for rent, utilities and other committed outgoings.' },
  { icon: Eye, label: 'Data Coverage', desc: 'A completeness score showing how much of the available evidence has been verified. More coverage means a stronger profile.' },
]

const WHAT_INSTITUTIONS_SEE = [
  'Your Trust Score grade and percentile ranking',
  'Which evidence modules have been completed and verified',
  'Income range and stability rating (not raw figures)',
  'A data coverage score showing profile completeness',
  'The date the profile was last updated and verified',
  'Nothing you have not explicitly chosen to share',
]

export default function TrustPortfolioPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Trust Portfolio</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          One verified profile.
          <br />
          <span className="text-teal">Every door it can open.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-cream">
          Your Trust Portfolio is a structured, verified record of your financial behaviour. Not a credit score borrowed from a bureau, but a profile built directly from your own data, verified by Equiscore, and shared on your terms.
        </p>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-cream">
          Landlords, lenders, banks and utility providers can request to view your portfolio. You decide who gets access and when. You can revoke that access at any time.
        </p>
      </section>

      {/* ── What it is and is not ────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Understanding your Trust Portfolio</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            What it is. What it is not.
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Because we produce a score, it is important to be clear about what that score represents and what it does not claim to do.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-teal/20 bg-teal/5 p-7">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-teal">It is</p>
              <ul className="space-y-5">
                {[
                  { title: 'A summary of verified evidence strength', body: 'The score reflects how complete and consistent your verified financial behaviour is. It represents what we can see, not a judgment on your character.' },
                  { title: 'A portable evidence profile', body: 'You build it once and share it with whoever needs it, on your terms. It works across rental applications, bank onboarding, lending decisions and more.' },
                  { title: 'User-controlled', body: 'Nothing is shared with any institution unless you explicitly generate and send a link. There is no background sharing.' },
                  { title: 'A supplement to existing checks', body: 'It gives landlords, lenders and banks additional context they could not otherwise see. It works alongside their process, not instead of it.' },
                ].map(({ title, body }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-1 shrink-0 text-sm font-bold text-teal">✓</span>
                    <div>
                      <p className="mb-1 font-semibold text-cream">{title}</p>
                      <p className="text-sm leading-relaxed text-cream">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-ink-border bg-ink-mid p-7">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-cream/50">It is not</p>
              <ul className="space-y-5">
                {[
                  { title: 'A credit bureau score', body: 'We are not a credit reference agency. We do not supply data to credit bureaus, draw on bureau data to produce your score, or appear on your credit file.' },
                  { title: 'A guarantee of approval', body: 'Institutions make their own decisions. Your Trust Portfolio gives them better evidence. It does not bind them to a particular outcome.' },
                  { title: 'A replacement for existing checks', body: 'We work alongside your landlord or lender\'s existing process. We do not expect institutions to rely on a Trust Portfolio as their only decision input.' },
                  { title: 'Automatically shared with anyone', body: 'Your score updates as you add evidence, but nothing is sent to any institution without a deliberate action from you. Private by default, always.' },
                ].map(({ title, body }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-1 shrink-0 text-sm font-bold text-cream/30">✕</span>
                    <div>
                      <p className="mb-1 font-semibold text-cream">{title}</p>
                      <p className="text-sm leading-relaxed text-cream">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Score grades ───────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">The scoring system</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Your Trust Score: what it means and how it is calculated
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Trust Scores run from A to E. They are not a judgment on your past. They reflect the strength and completeness of your verified evidence right now, and they can improve as your profile grows.
          </p>

          <div className="space-y-3">
            {TIERS.map(({ grade, label, color, bg, desc }) => (
              <div key={grade} className={`flex items-center gap-5 rounded-xl border ${color.includes('teal') ? 'border-teal/20' : 'border-ink-border'} ${bg} px-6 py-4`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${color} text-xl font-bold`}>
                  {grade}
                </div>
                <div>
                  <p className={`mb-1 font-semibold ${color.split(' ')[1]}`}>{label}</p>
                  <p className="text-sm text-cream">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-cream">
            Your score is recalculated each time new evidence is added or verified. It reflects your current profile, not a fixed snapshot.
          </p>
        </div>
      </section>

      {/* ── What goes into it ────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">What your profile contains</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Five evidence modules. One verified picture.
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Each module represents a category of evidence we can verify. The more modules you complete, the higher your data coverage score and the stronger your overall profile.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl border border-ink-border bg-ink-mid p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <p className="mb-2 font-semibold text-cream">{label}</p>
                <p className="text-sm leading-relaxed text-cream">{desc}</p>
              </div>
            ))}
            <div className="flex items-center justify-center rounded-xl border border-dashed border-ink-border p-5 text-center">
              <p className="text-sm text-cream">More modules added as the platform grows</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What institutions see ────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">Privacy by design</p>
              <h2 className="mb-6 text-3xl font-bold text-cream">
                What an institution sees when you share your portfolio
              </h2>
              <p className="mb-8 leading-relaxed text-cream">
                When you choose to share your Trust Portfolio, institutions receive a structured summary, not your raw bank data. They see what is relevant to their decision, verified by Equiscore, with nothing extra.
              </p>
              <ul className="space-y-3">
                {WHAT_INSTITUTIONS_SEE.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-cream">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-ink-border bg-ink-mid p-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-teal">EQUISCORE</p>
                  <p className="text-sm font-semibold text-cream">Trust Portfolio</p>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-teal/20 bg-teal/10 px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3 text-teal" />
                  <span className="text-xs font-medium text-teal">VERIFIED</span>
                </div>
              </div>
              <div className="mb-6 flex items-center justify-center py-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-teal text-3xl font-bold text-cream">
                  B
                </div>
              </div>
              <div className="space-y-3 border-t border-ink-border pt-4">
                {['Open Banking', 'Income Stability', 'Identity', 'Rent & Bills'].map((m) => (
                  <div key={m} className="flex items-center justify-between text-sm">
                    <span className="text-cream">{m}</span>
                    <div className="flex items-center gap-1.5 text-teal">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="text-xs">Verified</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-ink px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cream">Data Coverage</span>
                  <span className="font-semibold text-teal">80%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-border">
                  <div className="h-full w-4/5 rounded-full bg-teal" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How sharing works ────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">You are in control</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">Sharing your Trust Portfolio</h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Your portfolio is never shared without your explicit action. When you are ready to use it, here is how it works.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', icon: Share2, title: 'Generate a share link', desc: 'Create a one-time or time-limited link from your dashboard to send to a specific institution or individual.' },
              { n: '2', icon: Eye, title: 'The institution reviews it', desc: 'They see your verified Trust Portfolio summary. No raw bank data. No information beyond what you chose to include.' },
              { n: '3', icon: Lock, title: 'You revoke access when done', desc: 'Once your application is decided, you can revoke the link from your dashboard. Access is gone immediately.' },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="rounded-xl border border-ink-border bg-ink-mid p-6 text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-teal text-sm font-bold text-ink">
                  {n}
                </div>
                <Icon className="mx-auto mb-3 h-5 w-5 text-teal" />
                <h3 className="mb-2 font-semibold text-cream">{title}</h3>
                <p className="text-sm leading-relaxed text-cream">{desc}</p>
              </div>
            ))}
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
            <h2 className="mb-4 text-3xl font-bold text-cream">Build your Trust Portfolio</h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-cream">
              Takes about 15 minutes. Your data is encrypted and private. You decide who sees it.
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
                How we build it <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
