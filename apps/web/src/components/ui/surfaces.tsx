import { cn } from '@/lib/utils'

/**
 * EquiScore surface primitives (Phase 1).
 *
 * Philosophy: "modern financial report", not "dashboard of cards". Prefer
 * grouped `Section`s with hairline dividers and aligned `MetricGroup`s over
 * boxing every number in its own card. The boxed `Card` is for genuine primary
 * blocks; cream (`InsetPanel`) is a *supporting* surface, not the default.
 *
 * Surface hierarchy: page (warm stone) → card (crisp near-white) → inset (cream).
 * A card is defined by the page↔card surface step + a low-contrast border, not a
 * heavy outline. Only `Card` carries the one sanctioned shadow; insets stay flat.
 */

type Div = React.HTMLAttributes<HTMLDivElement>

const PAD = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-6 sm:p-8' } as const

/** Primary content block: crisp near-white, low-contrast border, subtle shadow. */
export function Card({
  className,
  padding = 'md',
  ...props
}: Div & { padding?: keyof typeof PAD }) {
  return (
    <div
      className={cn('rounded-2xl border border-line bg-surface-card shadow-card', PAD[padding], className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: Div) {
  return <div className={cn('mb-4 flex items-start justify-between gap-4', className)} {...props} />
}

export function CardBody({ className, ...props }: Div) {
  return <div className={cn('', className)} {...props} />
}

/**
 * Report-style grouped section — the DEFAULT grouping. Flat (no box), an
 * optional titled header with a hairline divider, generous vertical rhythm.
 */
export function Section({
  title,
  eyebrow,
  description,
  action,
  className,
  children,
}: {
  title?: React.ReactNode
  eyebrow?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || eyebrow || action) && (
        <div className="flex items-end justify-between gap-4 border-b border-line-subtle pb-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-content-muted">{eyebrow}</p>
            )}
            {title && <h2 className="text-lg font-semibold text-content">{title}</h2>}
            {description && <p className="mt-1 text-sm text-content-secondary">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

/** Hairline divider. */
export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line-subtle', className)} />
}

/** Supporting cream inset — for explanations, guidance, secondary detail. Flat. */
export function InsetPanel({
  className,
  padding = 'sm',
  ...props
}: Div & { padding?: keyof typeof PAD }) {
  return <div className={cn('rounded-xl bg-surface-inset', PAD[padding], className)} {...props} />
}

/** A selectable / expandable row. Hover + selected states, no extra colour. */
export function InteractiveRow({
  selected,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        selected ? 'bg-brand-50 ring-1 ring-brand-100' : 'hover:bg-surface-hover',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Aligned metric group — several figures separated by dividers/columns rather
 * than boxed individually. The report alternative to a row of stat cards.
 */
export function MetricGroup({ className, ...props }: Div) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-line-subtle sm:grid-cols-4 sm:divide-x [&>*]:px-0 sm:[&>*]:px-4 sm:[&>*:first-child]:pl-0',
        className,
      )}
      {...props}
    />
  )
}

export function Metric({
  label,
  value,
  hint,
  tone = 'neutral',
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'neutral' | 'positive' | 'negative'
  className?: string
}) {
  return (
    <div className={cn('py-2', className)}>
      <p className="text-xs text-content-muted">{label}</p>
      <p
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums',
          tone === 'positive' ? 'text-success-strong' : tone === 'negative' ? 'text-danger-strong' : 'text-content',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-content-muted">{hint}</p>}
    </div>
  )
}

/** Boxed metric — for the occasions a single figure genuinely warrants a tile. */
export function MetricCard({
  label,
  value,
  hint,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-xl bg-surface-inset px-4 py-3', className)}>
      <p className="text-xs text-content-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-content">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-content-muted">{hint}</p>}
    </div>
  )
}
