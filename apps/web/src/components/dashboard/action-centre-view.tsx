'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, ListChecks } from 'lucide-react'
import { useActionItems } from '@/lib/use-action-items'

export function ActionCentreView() {
  const { items, isLoading } = useActionItems()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight text-charcoal">Action Centre</h1>
        <p className="mt-1.5 text-sm text-charcoal-mid">
          The outstanding steps that will strengthen your Trust Portfolio, in priority order. Each
          improves the confidence and evidence behind your assessment.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-cream-surface p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
          <p className="mt-3 text-lg font-semibold text-charcoal">You're all caught up</p>
          <p className="mt-1 max-w-sm text-sm text-charcoal-mid">
            There are no outstanding actions. Your Trust Portfolio is ready to share whenever you
            need it.
          </p>
          <Link
            href="/dashboard/share"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-cream-surface hover:bg-brand-dark"
          >
            Create a share
          </Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((item, i) => (
            <li
              key={item.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-cream-surface p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-charcoal">{item.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-charcoal-mid">{item.detail}</p>
                </div>
              </div>
              <Link
                href={item.href}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-cream-surface hover:bg-brand-dark sm:self-center"
              >
                {item.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-center gap-2 rounded-xl bg-surface-subtle px-4 py-3 text-sm text-charcoal-mid">
        <ListChecks className="h-4 w-4 shrink-0 text-brand-mid" aria-hidden />
        Completing these raises your assessment confidence, not just your score.
      </div>
    </div>
  )
}
