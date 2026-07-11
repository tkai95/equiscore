import { cn } from '@/lib/utils'

/**
 * The one status indicator. Meaning → colour flows through semantic tokens, so
 * "verified", "needs attention" and "adverse" read the same everywhere — and
 * brand green is NOT overloaded to mean every positive state. Neutral is for
 * "not assessed".
 */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONES: Record<StatusTone, string> = {
  success: 'bg-success-soft text-success-strong',
  warning: 'bg-warning-soft text-warning-strong',
  danger: 'bg-danger-soft text-danger-strong',
  info: 'bg-info-soft text-info-strong',
  neutral: 'bg-surface-inset text-content-secondary',
}

export function StatusPill({
  status,
  label,
  icon,
  className,
}: {
  status: StatusTone
  label: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium',
        TONES[status],
        className,
      )}
    >
      {icon && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
      {label}
    </span>
  )
}
