'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, ListChecks } from 'lucide-react'
import { useActionItems } from '@/lib/use-action-items'
import { buttonClasses, Card, PageLayout, PageHeader } from '@/components/ui'

export function ActionCentreView() {
  const { items, isLoading } = useActionItems()

  return (
    <PageLayout width="narrow">
      <PageHeader
        title="Action Centre"
        description="The outstanding steps that will strengthen your Trust Portfolio, in priority order. Each improves the confidence and evidence behind your assessment."
      />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-card bg-surface-hover" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center text-center" padding="lg">
          <CheckCircle2 className="h-10 w-10 text-success-strong" aria-hidden />
          <p className="mt-3 text-lg font-semibold text-content">You&apos;re all caught up</p>
          <p className="mt-1 max-w-sm text-sm text-content-secondary">
            There are no outstanding actions. Your Trust Portfolio is ready to share whenever you
            need it.
          </p>
          <Link href="/dashboard/share" className={buttonClasses('primary', 'md', 'mt-5')}>
            Create a share
          </Link>
        </Card>
      ) : (
        <ol className="space-y-3">
          {items.map((item, i) => (
            <li key={item.id}>
              <Card
                padding="md"
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-900">
                    {i + 1}
                  </span>
                  <div>
                    <h2 className="text-[15px] font-semibold text-content">{item.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-content-secondary">{item.detail}</p>
                  </div>
                </div>
                <Link
                  href={item.href}
                  className={buttonClasses('primary', 'md', 'shrink-0 sm:self-center')}
                >
                  {item.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-center gap-2 rounded-panel bg-surface-inset px-4 py-3 text-sm text-content-secondary">
        <ListChecks className="h-4 w-4 shrink-0 text-brand-900" aria-hidden />
        Completing these raises your assessment confidence, not just your score.
      </div>
    </PageLayout>
  )
}
