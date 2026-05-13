import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { RegisterInterestButton } from '@/components/landing/register-interest-modal'
import { isPublicSite } from '@/lib/site'
import {
  ArrowRight,
  Lock,
  Home,
  Landmark,
  Zap,
  CreditCard,
  Briefcase,
  Eye,
  Clock,
  ShieldCheck,
  Share2,
} from 'lucide-react'

const WHO_YOU_CAN_SHARE_WITH = [
  {
    icon: Home,
    label: 'Landlords & letting agents',
    desc: 'Share your Trust Portfolio in place of or alongside a standard reference. A verified open banking connection and rental payment history tells a more complete story than a credit check alone.',
  },
  {
    icon: Landmark,
    label: 'Banks & fintechs',
    desc: 'For account applications, basic credit assessments, or demonstrating financial rehabilitation following an account closure. Your portfolio gives a regulated institution something concrete to look at.',
  },
  {
    icon: CreditCard,
    label: 'Credit & lending providers',
    desc: 'Supplementary affordability evidence for loan or credit card applications, particularly where your credit file does not tell the full picture of your current financial situation.',
  },
  {
    icon: Zap,
    label: 'Utility providers',
    desc: 'For accounts where a deposit is being requested or an application has been declined. Evidence of consistent bill payment behaviour and stable income can support a review.',
  },
  {
    icon: Briefcase,
    label: 'Regulated employers',
    desc: 'Roles in financial services, the public sector and other regulated industries often require financial vetting. Your Trust Portfolio provides a structured, verified record that goes beyond a basic credit search.',
  },
]

const WHAT_THEY_SEE = [
  {
    visible: true,
    item: 'Your Trust Score grade (A to E)',
  },
  {
    visible: true,
    item: 'Your percentile position',
  },
  {
    visible: true,
    item: 'Portfolio Strength percentage',
  },
  {
    visible: true,
    item: 'Which modules are verified and which are not',
  },
  {
    visible: true,
    item: 'Supporting documents you chose to include in this share',
  },
  {
    visible: false,
    item: 'Your raw transaction data',
  },
  {
    visible: false,
    item: 'Documents not included in this specific share',
  },
  {
    visible: false,
    item: 'Any data from previous shares or other recipients',
  },
]

export default function SharingPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Sharing your profile</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          You share your Trust Portfolio.
          <br />
          <span className="text-teal">Nobody else does.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-cream">
          Your Trust Portfolio is private by default. It is not visible to institutions, searchable by third parties, or shared in the background. When you want someone to see it, you decide, you initiate, and you can end it at any time.
        </p>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-cream">
          This page explains how sharing works, what recipients can see, and how you stay in control.
        </p>
      </section>

      {/* ── How sharing works ────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">How it works</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Deliberate, controlled, and reversible
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Sharing a Trust Portfolio is a specific action you take, not a background process. Here is how it works.
          </p>

          <div className="space-y-4">
            {[
              {
                icon: Share2,
                title: 'You generate a share from your account',
                body: 'When you are ready to share, you create a share from within your profile. You choose which supporting documents to include, and you review exactly what the recipient will see before anything is sent.',
              },
              {
                icon: Eye,
                title: 'You send it to the recipient',
                body: 'You receive a secure link you can send directly to the institution or individual you want to share with. The link gives them access to a read-only view of your Trust Portfolio. You can also download a PDF version if the recipient requires a document rather than a link.',
              },
              {
                icon: Clock,
                title: 'Access expires automatically',
                body: 'Every shared link has a built-in expiry. Once the access window closes, the recipient can no longer view your profile. You can also revoke a share manually at any time before it expires.',
              },
              {
                icon: ShieldCheck,
                title: 'You can see who has viewed it',
                body: 'Your account shows you a log of each share you have created, whether it has been viewed, and when. You are not left wondering whether the right person saw your profile.',
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                    <item.icon className="h-5 w-5 text-teal" />
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold text-cream">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-cream">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What they see ────────────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">What a recipient sees</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            Enough to make a decision. Nothing more.
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            The shared view is a structured summary. Institutions get a clear, verified picture. They do not get access to your raw financial data.
          </p>

          <div className="rounded-2xl border border-ink-border bg-ink-mid p-8">
            <div className="grid gap-3 sm:grid-cols-2">
              {WHAT_THEY_SEE.map(({ visible, item }) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-ink-border bg-ink px-4 py-3">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${visible ? 'bg-teal/20' : 'bg-cream/5'}`}>
                    <span className={`text-xs font-bold ${visible ? 'text-teal' : 'text-cream/30'}`}>
                      {visible ? '✓' : '✕'}
                    </span>
                  </div>
                  <p className={`text-sm ${visible ? 'text-cream' : 'text-cream/40'}`}>{item}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-relaxed text-cream/70">
              Raw transaction data never leaves Equiscore. What the recipient sees is a verified summary derived from that data, not the data itself.
            </p>
          </div>
        </div>
      </section>

      {/* ── Who you share with ───────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">Where your portfolio works</p>
          <h2 className="mb-4 text-center text-3xl font-bold text-cream">
            One Trust Portfolio. Many different doors.
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center leading-relaxed text-cream">
            Your Trust Portfolio is designed to be useful across a wide range of situations where a traditional credit file falls short.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHO_YOU_CAN_SHARE_WITH.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl border border-ink-border bg-ink-mid p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-teal/20 bg-teal/10">
                  <Icon className="h-5 w-5 text-teal" />
                </div>
                <h3 className="mb-2 font-semibold text-cream">{label}</h3>
                <p className="text-sm leading-relaxed text-cream">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Staying in control ───────────────────────────────────── */}
      <section className="bg-ink py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-teal">You stay in control</p>
          <h2 className="mb-10 text-center text-3xl font-bold text-cream">
            A share is not permanent. Your data is not out in the world.
          </h2>
          <div className="space-y-5">
            <p className="text-lg leading-relaxed text-cream">
              Every share you create is time-limited. Once the access window closes, that link no longer works. There is no cached version sitting on the recipient's system that we cannot reach.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              If you share your Trust Portfolio with a landlord and they decline you, that is the end of it. They cannot pass your profile to a third party, retain a copy beyond the share window, or access it again without a new share from you.
            </p>
            <p className="text-lg leading-relaxed text-cream">
              If you want to revoke access before it expires, you can. Your account gives you full visibility over every active and expired share so you are never unsure about where your profile has been.
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
              Build the profile that opens doors.
            </h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-cream">
              Takes about 15 minutes to set up. Private by default. You decide what to share and who to share it with.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isPublicSite ? (
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
                How EquiScore works <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
