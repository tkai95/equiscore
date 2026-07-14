'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, ListChecks } from 'lucide-react'
import { useActionItems } from '@/lib/use-action-items'
import { buttonClasses, Card, PageLayout, PageHeader } from '@/components/ui'

export function ActionCentreView() {
  const { items, isLoading } = useActionItems()

  return (
    <PageLayout width="narrow">
      <PageHeader title="To do" />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-card bg-surface-hover h-28 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center text-center" padding="lg">
          <CheckCircle2 className="text-success-strong h-10 w-10" aria-hidden />
          <p className="text-content mt-3 text-lg font-semibold">You&apos;re all caught up</p>
          <p className="text-content-secondary mt-1 max-w-sm text-sm">
            There are no outstanding actions. Your Trust Profile is ready to share whenever you need
            it.
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
                  <span className="bg-brand-50 text-brand-900 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                    {i + 1}
                  </span>
                  <div>
                    <h2 className="text-content text-[15px] font-semibold">{item.title}</h2>
                    <p className="text-content-secondary mt-1 text-sm leading-relaxed">
                      {item.detail}
                    </p>
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

      <div className="rounded-panel bg-surface-inset text-content-secondary flex items-center gap-2 px-4 py-3 text-sm">
        <ListChecks className="text-brand-900 h-4 w-4 shrink-0" aria-hidden />
        Completing these raises your assessment confidence, not just your score.
      </div>
    </PageLayout>
  )
}
