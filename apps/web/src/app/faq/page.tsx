import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers to common questions about Equiscore.',
}

const faqs = [
  {
    category: 'The basics',
    items: [
      {
        q: 'What is Equiscore?',
        a: "Equiscore is a financial identity platform. You connect your bank account via Open Banking, and we build a verified trust profile based on your actual financial behaviour. You can then share that profile with landlords, lenders, or employers.",
      },
      {
        q: 'Who is it for?',
        a: "Anyone with a thin or non-existent UK credit history. That includes people who have recently moved to the UK, freelancers and gig workers, students, recent graduates, and anyone who has never needed to borrow money and therefore has nothing on file.",
      },
      {
        q: 'Is Equiscore a credit check?',
        a: "No. A credit check pulls data from credit reference agencies like Experian or Equifax. Equiscore uses Open Banking, which means you connect your actual bank account and we analyse your real financial behaviour. You can use it alongside a credit check or as an alternative.",
      },
    ],
  },
  {
    category: 'Your data',
    items: [
      {
        q: 'Can my landlord see my bank transactions?',
        a: "No. We analyse your transactions to build your trust score, but we never share the raw transaction data. What your landlord sees is your verified profile: your trust tier, the dimensions it covers, and the signals that support it.",
      },
      {
        q: 'Is my bank data stored permanently?',
        a: "We store the data needed to calculate and display your score. You can request deletion of your account and all associated data at any time from your settings page. Deletion is processed within 30 days.",
      },
      {
        q: "Can I revoke Equiscore's access to my bank?",
        a: "Yes. You can disconnect your bank at any time from the Connections page in your dashboard. You can also revoke access directly through your bank's own app or online banking.",
      },
      {
        q: 'Is Equiscore GDPR compliant?',
        a: "Yes. We process your data in accordance with UK GDPR. You have the right to access, correct, export, and delete your data. See our privacy policy for full details.",
      },
    ],
  },
  {
    category: 'Your trust score',
    items: [
      {
        q: 'How is my trust score calculated?',
        a: "We look at multiple dimensions: income consistency, rent and bill payment patterns, spending stability, and how long you have held your current bank account. Each dimension contributes to a single trust tier from A (highly verified) down to E (insufficient data). You can see every signal that went into your score from your dashboard.",
      },
      {
        q: 'What if I have a low score?',
        a: "A lower tier usually means we don't have enough data yet, not that you are a financial risk. Connecting your bank account and allowing more transaction history to accumulate will improve your score over time. You can see exactly which signals are missing.",
      },
      {
        q: 'Does Equiscore affect my credit file?',
        a: "No. Equiscore does not perform a hard or soft credit search and has no connection to UK credit reference agencies. Your credit file is not affected in any way.",
      },
    ],
  },
  {
    category: 'Sharing your profile',
    items: [
      {
        q: 'How do I share my profile?',
        a: "From your dashboard, go to Share Profile and generate a secure link. You can send that link to your landlord, employer, or lender. The link expires after a set period and you can revoke it at any time.",
      },
      {
        q: 'Can I see who has viewed my profile?',
        a: "You can see which links are active and when they were last accessed. Full viewer-level analytics are on the roadmap.",
      },
    ],
  },
  {
    category: 'Account and billing',
    items: [
      {
        q: 'Is Equiscore free?',
        a: "Yes, everything is free during the beta period. No payment card is required. See our pricing page for details on what happens after beta.",
      },
      {
        q: 'How do I delete my account?',
        a: "Go to Settings in your dashboard and select Delete account. Your data will be permanently removed within 30 days.",
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingNav />

      <section className="mx-auto max-w-3xl px-6 py-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">FAQ</p>
        <h1 className="mb-4 text-4xl font-bold text-gray-900">Common questions</h1>
        <p className="mb-16 text-xl text-gray-600">
          Not finding what you need?{' '}
          <Link href="/contact" className="text-blue-600 hover:underline">
            Get in touch.
          </Link>
        </p>

        <div className="space-y-14">
          {faqs.map(({ category, items }) => (
            <div key={category}>
              <h2 className="mb-6 text-lg font-semibold text-gray-900">{category}</h2>
              <div className="space-y-6">
                {items.map(({ q, a }) => (
                  <div key={q} className="border-b border-gray-100 pb-6">
                    <p className="mb-2 font-medium text-gray-900">{q}</p>
                    <p className="text-sm leading-relaxed text-gray-600">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
