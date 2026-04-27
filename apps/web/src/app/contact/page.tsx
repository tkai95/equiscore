import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { Mail, MessageSquare, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Equiscore team.',
}

const channels = [
  {
    icon: Mail,
    title: 'General enquiries',
    body: 'Questions about the product, how it works, or anything else.',
    cta: 'hello@equiscore.app',
    href: 'mailto:hello@equiscore.app',
  },
  {
    icon: MessageSquare,
    title: 'Privacy and data requests',
    body: 'To exercise your GDPR rights, request data access or deletion, or report a data concern.',
    cta: 'privacy@equiscore.app',
    href: 'mailto:privacy@equiscore.app',
  },
  {
    icon: ShieldCheck,
    title: 'Security disclosures',
    body: 'If you have found a potential security vulnerability, please report it responsibly.',
    cta: 'security@equiscore.app',
    href: 'mailto:security@equiscore.app',
  },
]

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-cream">
      <LandingNav />

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand">
            Contact
          </p>
          <h1 className="mb-6 text-4xl font-bold text-charcoal lg:text-5xl">Get in touch</h1>
          <p className="text-xl text-charcoal-mid">
            We are a small team. We read every email and aim to respond within one business day.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {channels.map(({ icon: Icon, title, body, cta, href }) => (
            <div key={title} className="rounded-2xl border border-[#D8D6C9] bg-cream-surface p-6">
              <Icon className="mb-4 h-6 w-6 text-brand" />
              <h2 className="mb-2 font-semibold text-charcoal">{title}</h2>
              <p className="mb-4 text-sm leading-relaxed text-charcoal-mid">{body}</p>
              <a href={href} className="text-sm font-medium text-brand hover:underline">
                {cta}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-[#D8D6C9] bg-cream-surface p-8">
          <p className="mb-2 font-semibold text-charcoal">Looking for answers first?</p>
          <p className="mb-4 text-sm text-charcoal-mid">
            Our FAQ covers the most common questions about how Equiscore works, data privacy, and
            sharing your profile.
          </p>
          <Link href="/faq" className="text-sm font-medium text-brand hover:underline">
            Visit the FAQ
          </Link>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
