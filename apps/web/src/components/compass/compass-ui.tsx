'use client'

import { ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

/** Whole-pound currency (Compass figures are already rounded server-side). */
export function money(n: number): string {
  return formatCurrency(Math.round(n)).replace(/\.00$/, '')
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-xl border border-gray-200 bg-white p-5 sm:p-6', className)}>{children}</div>
}

export function CardTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{children}</p>
}

/** Inset stat tile — the workhorse for a monthly figure. */
export function StatTile({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string
  tone?: 'in' | 'out' | 'neutral'
  hint?: string
}) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5">
      <p className="text-xs text-gray-400">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-base font-semibold tabular-nums',
          tone === 'in' ? 'text-emerald-600' : tone === 'out' ? 'text-rose-600' : 'text-gray-900',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

/** A clickable row that opens a drill-down drawer. */
export function DrillRow({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-gray-50"
    >
      {children}
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
    </button>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'good' | 'warn' | 'neutral' }) {
  const tones = {
    good: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    warn: 'bg-amber-50 text-amber-700 ring-amber-200',
    neutral: 'bg-gray-50 text-gray-600 ring-gray-200',
  } as const
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', tones[tone])}>
      {children}
    </span>
  )
}

/** A horizontal proportion bar (0–1). */
export function Bar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'amber' | 'rose' }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const fill = tone === 'amber' ? 'bg-amber-400' : tone === 'rose' ? 'bg-rose-400' : 'bg-brand'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={cn('h-full rounded-full', fill)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-gray-300">{icon}</div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{body}</p>
    </div>
  )
}
