import type { TrustTier } from '@equiscore/shared'
import { cn, TIER_COLORS } from '@/lib/utils'

interface TierBadgeProps {
  tier: TrustTier
  size?: 'sm' | 'md' | 'lg'
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold',
        TIER_COLORS[tier],
        {
          'px-2.5 py-0.5 text-xs': size === 'sm',
          'px-3 py-1 text-sm': size === 'md',
          'px-4 py-1.5 text-base': size === 'lg',
        }
      )}
    >
      Tier {tier}
    </span>
  )
}
