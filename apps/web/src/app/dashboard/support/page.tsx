import { FAQS } from '@/lib/content/faq'
import { FaqAccordion } from '@/components/support/faq-accordion'
import { PageHeader, PageLayout } from '@/components/ui'

export const metadata = { title: 'Help & support' }

export default function SupportPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Help & support"
        description="Everything you need to know about Equiscore, your Trust Portfolio, your data, and sharing."
      />
      <div className="space-y-8">
        {FAQS.map((section) => (
          <FaqAccordion key={section.category} section={section} />
        ))}
      </div>
      <div className="rounded-card border border-line bg-surface-card px-8 py-8 text-center">
        <p className="font-semibold text-content">Still have a question?</p>
        <p className="mt-1 text-sm text-content-secondary">
          If you cannot find what you are looking for, get in touch and we will come back to you.
        </p>
        <a
          href="/contact"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-content transition-colors hover:bg-surface-hover"
        >
          Contact us
        </a>
      </div>
    </PageLayout>
  )
}
