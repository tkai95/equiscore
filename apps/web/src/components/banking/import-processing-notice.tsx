'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonClasses } from '@/components/ui'

/**
 * Inline "we're reading your statement" indicator, swapped in for an "Upload a
 * statement" CTA while a background import is running — so every surface stays
 * consistent with the global chip instead of contradicting it.
 *
 * - variant="button": a button-shaped disabled element, for surfaces whose
 *   empty state is an Upload button/link (Dashboard, Trust, Compass, To do).
 * - variant="panel": a bordered panel, for surfaces whose empty state is text
 *   only (Analytics, Insight profile).
 */
export function ImportProcessingNotice({
  variant = 'button',
  message = 'Reading your statement…',
  subtext = 'We’ll show your analysis here as soon as it’s ready.',
  className,
}: {
  variant?: 'button' | 'panel'
  message?: string
  subtext?: string
  className?: string
}) {
  if (variant === 'panel') {
    return (
      <div className={cn('rounded-card border border-dashed border-line p-10 text-center', className)}>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-900" />
        <p className="mt-3 text-sm font-medium text-content">{message}</p>
        <p className="mt-1 text-xs text-content-muted">{subtext}</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        buttonClasses('primary', 'md'),
        'pointer-events-none inline-flex cursor-default items-center gap-2 opacity-80',
        className
      )}
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {message}
    </div>
  )
}
