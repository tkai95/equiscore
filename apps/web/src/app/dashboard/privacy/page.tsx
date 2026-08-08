import { SECURITY_PILLARS } from '@/lib/content/security'
import { PageHeader, PageLayout } from '@/components/ui'

export const metadata = { title: 'Privacy & security' }

export default function PrivacyPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Privacy & security"
        description="We built Equiscore around bank-level data access. Here is how we protect your information."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SECURITY_PILLARS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-card border border-line bg-surface-card p-6">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-panel bg-brand-50 text-brand-900">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-sm font-semibold text-content">{title}</h3>
            <p className="text-sm leading-relaxed text-content-secondary">{body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-line bg-surface-card px-8 py-8 text-center">
        <h2 className="text-lg font-semibold text-content">Found a security issue?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-content-secondary">
          If you believe you have discovered a security vulnerability, please report it responsibly
          by emailing{' '}
          <a href="mailto:security@equiscore.app" className="font-medium text-brand-900 hover:underline">
            security@equiscore.app
          </a>
          . We take all reports seriously and will respond within 48 hours.
        </p>
      </div>
    </PageLayout>
  )
}
