import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The one canonical button. Every variant shares height, radius, weight,
 * focus, disabled and loading behaviour, so buttons stop drifting per screen.
 * Primary = brand green; destructive uses danger (never the brand treatment);
 * ordinary buttons are flat (no shadow).
 */

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-cream-surface hover:bg-brand-dark',
  secondary: 'border border-line bg-surface-card text-content hover:bg-surface-hover',
  tertiary: 'bg-brand-50 text-brand-900 hover:bg-brand-100',
  destructive: 'bg-danger text-cream-surface hover:bg-danger-strong',
  ghost: 'text-content hover:bg-surface-hover',
  link: 'h-auto p-0 text-brand-900 underline-offset-4 hover:underline',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-9 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-11 gap-2 rounded-lg px-5 text-[15px]',
}

/** Class builder — so anchors / Next `Link`s can wear the same button styles. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    variant !== 'link' && SIZES[size],
    VARIANTS[variant],
    className,
  )
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
