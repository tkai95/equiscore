'use client'

import { ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

/** Whole-pound currency (Compass figures are already rounded server-side). */
export function money(n: number): string {
  return formatCurrency(Math.round(n)).replace(/\.00$/, '')
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-card border border-line bg-surface-card p-5 sm:p-6', className)}>{children}</div>
}

export function CardTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-content">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-content-secondary">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">{children}</p>
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
    <div className="rounded-panel bg-surface-inset px-3 py-2.5">
      <p className="text-xs text-content-muted">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-base font-semibold tabular-nums',
          tone === 'in' ? 'text-success-strong' : tone === 'out' ? 'text-warning-strong' : 'text-content',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-content-muted">{hint}</p>}
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
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-hover"
    >
      {children}
      <ChevronRight className="h-4 w-4 shrink-0 text-content-muted/60" />
    </button>
  )
}

/**
 * Compact status pill. Mirrors the shared `StatusPill` token mapping
 * (`good` → success, `warn` → warning, `neutral` → inset) at the smaller
 * inline size Compass uses throughout.
 */
export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'good' | 'warn' | 'neutral' }) {
  const tones = {
    good: 'bg-success-soft text-success-strong',
    warn: 'bg-warning-soft text-warning-strong',
    neutral: 'bg-surface-inset text-content-secondary',
  } as const
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', tones[tone])}>
      {children}
    </span>
  )
}

/** A horizontal proportion bar (0–1). */
export function Bar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'amber' | 'rose' }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const fill = tone === 'amber' ? 'bg-warning-bar' : tone === 'rose' ? 'bg-chart-6' : 'bg-brand-600'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
      <div className={cn('h-full rounded-full', fill)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface-card p-10 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-content-muted">{icon}</div>
      <p className="text-sm font-medium text-content">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-content-secondary">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
