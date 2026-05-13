'use client'

import { useState } from 'react'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ChevronDown } from 'lucide-react'

const FAQS: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: 'About Equiscore',
    items: [
      {
        q: 'What is Equiscore?',
        a: 'Equiscore is a financial trust platform that helps people build a verified Trust Portfolio based on their real financial behaviour. It is designed for people who are excluded or poorly served by the traditional credit scoring system, including migrants, gig workers, people with thin credit files, and those whose accounts have been closed.',
      },
      {
        q: 'Is Equiscore a credit reference agency?',
        a: 'No. Equiscore is not a credit reference agency and your Trust Portfolio is not a credit score. We do not hold data on behalf of lenders or report to credit bureaus. Your Trust Portfolio is a verified record of your own financial behaviour, built from your data, owned by you, and shared only when you choose to share it.',
      },
      {
        q: 'How is Equiscore different from a credit score?',
        a: 'A credit score is calculated by credit reference agencies using data about how you have used credit products in the past. It is shared with lenders without your direct input. An Equiscore Trust Portfolio is built from verified evidence about your actual financial behaviour, including income, spending patterns and payment consistency. You own it, you control it, and you decide who sees it. It works alongside your credit file rather than replacing it.',
      },
      {
        q: 'Who is Equiscore for?',
        a: 'Equiscore is for anyone who is underserved by the traditional credit system. That includes people who have recently arrived in the UK and have no local credit history, self-employed workers and freelancers whose income is variable, people with thin credit files who have never borrowed before, and those whose bank accounts have been closed or restricted. It is also useful for anyone who wants more control over how their financial data is shared and used.',
      },
      {
        q: 'Is Equiscore available now?',
        a: 'Equiscore is currently in its pre-launch phase. You can join the waitlist to be among the first to access the platform when we open. We are also working with a select group of partner institutions ahead of full launch.',
      },
    ],
  },
  {
    category: 'The Trust Portfolio',
    items: [
      {
        q: 'What is a Trust Portfolio?',
        a: 'A Trust Portfolio is a structured, verified record of your financial behaviour. It is built across four evidence modules: Open Banking, Income Stability, Identity, and Rent and Bills. Once built, it generates a Trust Score grade from A to E. You can share it with landlords, banks, lenders, and utility providers when you need to demonstrate your financial reliability.',
      },
      {
        q: 'What is a Trust Score?',
        a: 'Your Trust Score is a grade from A to E that reflects the quality and completeness of your verified evidence. A is the strongest grade. E typically reflects a new or incomplete profile. Your score is not fixed. It updates as your verified history grows and as you add new evidence modules.',
      },
      {
        q: 'How long does it take to build a Trust Portfolio?',
        a: 'The initial setup takes around 15 minutes. You will need a form of photo ID and access to your bank account for the open banking connection. After that, your profile continues to strengthen over time as more verified financial behaviour accumulates.',
      },
      {
        q: 'What goes into my Trust Portfolio?',
        a: 'Your Trust Portfolio is built from four evidence modules. Open Banking provides a verified view of your income, spending and payment patterns. Income Stability looks at the consistency and regularity of money coming into your account. Identity confirms who you are through document verification. Rent and Bills captures evidence of regular financial commitments such as rent payments and utility bills.',
      },
      {
        q: 'Can my Trust Score go down?',
        a: 'Your score reflects your current verified evidence. It will not go down because of things that happened in the past. If you disconnect your bank account, your profile will stop updating and your data coverage score may reduce over time as the data becomes older. Adding new evidence and keeping your connection active is the best way to maintain a strong score.',
      },
      {
        q: 'What if I have a low score?',
        a: 'A low score is a starting point, not a verdict. It typically means your profile is new or your evidence is limited. The clearest path to improvement is connecting your bank account, verifying your identity, and allowing time to pass so your verified history builds up. Every month of consistent financial behaviour adds to your profile.',
      },
    ],
  },
  {
    category: 'Open Banking',
    items: [
      {
        q: 'What is open banking?',
        a: 'Open banking is a regulated framework that allows you to share your bank account data with authorised third parties via a secure, standardised connection. It was introduced under the Payment Services Regulations 2017 as part of PSD2 and is regulated by the FCA. It is used by millions of people across the UK through budgeting apps, savings tools and financial management platforms.',
      },
      {
        q: 'Can Equiscore move money from my account?',
        a: 'No. The open banking connection we establish is read-only. We can see your transaction history, but we cannot initiate payments, move money, or take any action on your account. This is a technical restriction enforced at the infrastructure level, not just a policy.',
      },
      {
        q: 'Does Equiscore store my bank login credentials?',
        a: 'No. You authenticate directly with your bank through your bank\'s own interface. Your credentials never reach Equiscore. We receive only the data the regulated open banking connection permits us to see.',
      },
      {
        q: 'Which banks are supported?',
        a: 'We connect via FCA-regulated open banking infrastructure that supports the major UK banks and most challenger banks. If your bank supports open banking, which most UK accounts now do, you will be able to connect.',
      },
      {
        q: 'What happens if I disconnect my bank account?',
        a: 'If you disconnect your open banking connection, your existing verified data remains in your Trust Portfolio. Your profile will not update with new information until you reconnect. You can reconnect at any time from within your account.',
      },
      {
        q: 'Can I delete my data after connecting?',
        a: 'Yes. You can request deletion of your data at any time. Under UK GDPR you have the right to erasure. If you delete your data, your Trust Portfolio and any associated evidence will be removed. Any share links you have generated will stop working immediately.',
      },
    ],
  },
  {
    category: 'Sharing Your Portfolio',
    items: [
      {
        q: 'How do I share my Trust Portfolio?',
        a: 'From your dashboard, you generate a share link. You can make it one-time use or time-limited. You send the link to whoever needs to see your portfolio, for example a landlord, a bank or a lender. They see a structured summary of your verified profile. You retain control at all times.',
      },
      {
        q: 'What does someone see when I share my portfolio with them?',
        a: 'They see your Trust Score grade, which evidence modules have been completed and verified, an income range and stability rating rather than specific figures, your data coverage score, and the date the profile was last updated. They do not see raw bank statements, individual transactions, or anything you have not chosen to include.',
      },
      {
        q: 'Can I revoke access after sharing?',
        a: 'Yes. You can revoke any share link from your dashboard at any time. Once revoked, the recipient can no longer access your portfolio. This is immediate.',
      },
      {
        q: 'Can I choose what to include when sharing?',
        a: 'Yes. Before generating a share link, you can choose which evidence modules to include in the shared view. You are never required to share your full portfolio.',
      },
      {
        q: 'Is my data shared with institutions automatically?',
        a: 'No. Your data is never shared without your explicit action. No institution has access to your Trust Portfolio unless you have actively generated a link and sent it to them.',
      },
    ],
  },
  {
    category: 'Bank Accounts and Account Closures',
    items: [
      {
        q: 'My bank account was closed. Can Equiscore help?',
        a: 'Yes. A Trust Portfolio can help you demonstrate your current financial behaviour to providers who are willing to look beyond a closure event. It does not remove any record that exists with CIFAS or other fraud prevention databases, but it gives providers verified context about your situation today rather than a decision based solely on your history.',
      },
      {
        q: 'What is a CIFAS marker?',
        a: 'CIFAS is a fraud prevention organisation whose database is shared among over 680 member institutions. A CIFAS marker on your record means that a member organisation has flagged your account in connection with a fraud prevention concern. Markers can remain on record for up to six years and affect access to accounts, credit products, and other services across the entire network of member organisations.',
      },
      {
        q: 'Can Equiscore remove a CIFAS marker?',
        a: 'No. Equiscore cannot remove or alter records held by CIFAS or any credit reference agency. If you believe a marker has been applied incorrectly, you have the right to dispute it directly with CIFAS and with the organisation that placed it. What Equiscore can do is give you a verified record of your current financial behaviour that providers can consider alongside the marker.',
      },
      {
        q: 'Which banks and providers accept a Trust Portfolio?',
        a: 'We work with banks, fintechs, landlords and other providers who have committed to assessing applications using verified alternative data. As our partner network grows, the number of accepting providers will expand. You can join the waitlist to be notified when we launch.',
      },
    ],
  },
  {
    category: 'For Organisations',
    items: [
      {
        q: 'How does Equiscore work for landlords?',
        a: 'Tenants share their Trust Portfolio with you directly as part of the referencing process. You receive a structured summary of their verified income, payment behaviour and financial stability. This gives you additional evidence for cases where a standard credit check returns limited results, without replacing your existing referencing provider.',
      },
      {
        q: 'How does Equiscore work for banks and fintechs?',
        a: 'Equiscore provides an additional evidence layer for onboarding decisions where your standard checks return insufficient data. Applicants build a verified Trust Portfolio and share it with your team. You receive consent-led, structured affordability and behaviour data that can inform borderline decisions.',
      },
      {
        q: 'How does Equiscore work for utility providers?',
        a: 'Customers share their Trust Portfolio as part of your onboarding process. You receive verified affordability and payment behaviour data that helps you make better-informed decisions about account terms, including whether a customer can manage a direct debit rather than being placed on a prepayment arrangement.',
      },
      {
        q: 'How does Equiscore work for lenders?',
        a: 'Equiscore provides verified income, affordability and payment behaviour data for thin-file applicants your current scoring models cannot assess. It works alongside your existing credit bureau data and supports Consumer Duty-aligned decision making for non-standard borrowers.',
      },
      {
        q: 'Is the data FCA-regulated?',
        a: 'Yes. All bank connections are made via FCA-authorised open banking infrastructure. Data is accessed only with explicit customer consent and processed under UK GDPR. Equiscore does not scrape or harvest financial data.',
      },
      {
        q: 'How do we become a partner?',
        a: 'We are building our partner network ahead of full launch. If you are a bank, fintech, landlord, letting agent, utility provider or lender interested in using Equiscore data, visit our partners page or contact us directly.',
      },
    ],
  },
  {
    category: 'Privacy and Security',
    items: [
      {
        q: 'How is my data protected?',
        a: 'Your data is encrypted at rest and in transit. We use industry-standard security practices and process all personal data in accordance with UK GDPR. You can request a copy of your data or request deletion at any time.',
      },
      {
        q: 'Who can see my Trust Portfolio?',
        a: 'Only you can see your full Trust Portfolio. No institution or third party has access to your data unless you have explicitly generated a share link and sent it to them. Even then, they see only the summary view, not your raw data.',
      },
      {
        q: 'Does Equiscore sell my data?',
        a: 'No. We do not sell your personal data to third parties. Your data is used to build and maintain your Trust Portfolio and is shared with institutions only when you explicitly choose to share it.',
      },
      {
        q: 'How long do you keep my data?',
        a: 'We retain your data for as long as your account is active. If you close your account or request erasure, your data is deleted in accordance with our retention policy. Full details are in our privacy policy.',
      },
      {
        q: 'What are my rights under UK GDPR?',
        a: 'You have the right to access the data we hold about you, to correct inaccurate data, to request deletion, to object to processing, and to data portability. To exercise any of these rights, contact us through your account or via our contact page.',
      },
    ],
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-ink-border last:border-0">
      <button
        className="flex w-full items-start justify-between gap-6 py-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-base font-semibold text-cream">{q}</span>
        <ChevronDown
          className={`mt-0.5 h-5 w-5 shrink-0 text-teal transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-cream">{a}</p>
      )}
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">FAQ</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-cream lg:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-cream">
          Everything you need to know about Equiscore, the Trust Portfolio, open banking, and how sharing works.
        </p>
      </section>

      {/* ── FAQ sections ─────────────────────────────────────────── */}
      <section className="bg-ink pb-28 pt-4">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-10">
            {FAQS.map(({ category, items }) => (
              <div key={category}>
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-teal">
                  {category}
                </p>
                <div className="rounded-2xl border border-ink-border bg-ink-mid px-6">
                  {items.map(({ q, a }) => (
                    <FaqItem key={q} q={q} a={a} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-ink-border bg-ink-mid px-8 py-10 text-center">
            <p className="mb-2 font-semibold text-cream">Still have a question?</p>
            <p className="mb-6 text-sm leading-relaxed text-cream">
              If you cannot find what you are looking for, get in touch and we will come back to you.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-6 py-3 text-sm font-semibold text-cream transition-colors hover:border-cream/40"
            >
              Contact us
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
