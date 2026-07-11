import { cn } from '@/lib/utils'
import { PageTitle } from './typography'

/**
 * Shared page shell — one content width, one header rhythm, one action
 * placement, so pages stop positioning titles and actions ad hoc.
 */

const WIDTHS = { default: 'max-w-6xl', wide: 'max-w-[1360px]', narrow: 'max-w-3xl' } as const

export function PageLayout({
  width = 'default',
  className,
  children,
}: {
  width?: keyof typeof WIDTHS
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn('mx-auto space-y-6', WIDTHS[width], className)}>{children}</div>
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <PageTitle>{title}</PageTitle>
        {description && <p className="mt-1 max-w-2xl text-sm text-content-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function PageContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('space-y-6', className)}>{children}</div>
}
