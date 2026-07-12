import { cn } from '@/lib/utils'

/**
 * Typography primitives. One scale, applied through components so heading
 * sizes/weights stop being hand-tuned per screen.
 *
 * The DISPLAY serif is reserved for the Trust Score number, the tier name and
 * major assessment conclusions — never tables, labels, buttons or dense figures.
 */

type El = { className?: string; children: React.ReactNode }

/** Display serif — score, tier, major conclusions only. */
export function Display({
  size = 'lg',
  className,
  children,
}: El & { size?: 'sm' | 'md' | 'lg' | 'score' }) {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
    score: 'text-5xl leading-none',
  } as const
  return (
    <span className={cn('font-display font-semibold tabular-nums text-content', sizes[size], className)}>
      {children}
    </span>
  )
}

export function PageTitle({ className, children }: El) {
  return <h1 className={cn('text-[26px] font-semibold tracking-tight text-content', className)}>{children}</h1>
}

export function SectionTitle({ className, children }: El) {
  return <h2 className={cn('text-lg font-semibold text-content', className)}>{children}</h2>
}

export function CardTitle({ className, children }: El) {
  return <h3 className={cn('text-base font-semibold text-content', className)}>{children}</h3>
}

export function Eyebrow({ className, children }: El) {
  return (
    <p className={cn('text-xs font-semibold uppercase tracking-wide text-content-muted', className)}>{children}</p>
  )
}

export function BodyText({ className, children }: El) {
  return <p className={cn('text-sm leading-relaxed text-content-secondary', className)}>{children}</p>
}

export function SupportingText({ className, children }: El) {
  return <p className={cn('text-xs text-content-muted', className)}>{children}</p>
}

export function MetricValue({
  className,
  children,
  tone = 'neutral',
}: El & { tone?: 'neutral' | 'positive' | 'negative' }) {
  return (
    <span
      className={cn(
        'text-lg font-semibold tabular-nums',
        tone === 'positive' ? 'text-success-strong' : tone === 'negative' ? 'text-danger-strong' : 'text-content',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function MetricLabel({ className, children }: El) {
  return <span className={cn('text-xs text-content-muted', className)}>{children}</span>
}
