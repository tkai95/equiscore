import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ShieldCheck, Lock, Eye, Trash2, Server, Key } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Security',
  description: 'How Equiscore keeps your data safe.',
}

const pillars = [
  {
    icon: ShieldCheck,
    title: 'FCA authorised Open Banking',
    body: "Your bank connection is handled by TrueLayer, an FCA authorised Account Information Service Provider. We never see your banking password or PIN. The connection uses the same secure Open Banking standard your bank uses for its own app integrations.",
  },
  {
    icon: Lock,
    title: 'Encrypted in transit and at rest',
    body: 'All data transmitted between your browser and our servers uses TLS 1.3. Your data is encrypted at rest on Railway-hosted infrastructure. We do not store your raw bank credentials at any point.',
  },
  {
    icon: Key,
    title: 'Secure authentication',
    body: 'Account access is handled by Clerk, which supports multi-factor authentication, session management, and device tracking. We recommend enabling MFA on your Equiscore account.',
  },
  {
    icon: Eye,
    title: 'You control what gets shared',
    body: 'Landlords and lenders see only your verified trust profile. They never see your raw transaction data. Share links expire and can be revoked from your dashboard at any time.',
  },
  {
    icon: Server,
    title: 'Infrastructure security',
    body: 'Equiscore runs on Railway, with automated backups and network isolation between services. Our database is not publicly accessible. Access is restricted to application services only.',
  },
  {
    icon: Trash2,
    title: 'Data deletion',
    body: 'You can delete your account and all associated data at any time from your settings page. Deletion requests are processed within 30 days. Open Banking consent can be revoked separately without closing your account.',
  },
]

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingNav />

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">
            Security
          </p>
          <h1 className="mb-6 text-4xl font-bold text-gray-900 lg:text-5xl">
            Your data is handled with care.
          </h1>
          <p className="text-xl leading-relaxed text-gray-600">
            We built Equiscore around bank-level data access. That means our security standards
            have to match. Here is how we protect your information.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <Icon className="mb-4 h-6 w-6 text-blue-600" />
              <h3 className="mb-3 font-semibold text-gray-900">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-blue-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Found a security issue?</h2>
          <p className="mb-6 text-gray-600">
            If you believe you have discovered a security vulnerability, please report it
            responsibly by emailing{' '}
            <a href="mailto:security@equiscore.app" className="text-blue-600 hover:underline">
              security@equiscore.app
            </a>
            . We take all reports seriously and will respond within 48 hours.
          </p>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
