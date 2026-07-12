'use client'

import * as Tooltip from '@radix-ui/react-tooltip'
import { HelpCircle } from 'lucide-react'

/**
 * Small "how was this calculated" affordance. EquiScore's promise is that the
 * score is explainable, so every derived number should be able to say, in plain
 * words, what it means and how it was worked out. Self-contained provider so it
 * can be dropped in anywhere without a tree-level setup.
 */
export function InfoTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex items-center text-content-muted transition-colors hover:text-content-secondary focus:outline-none focus-visible:text-content-secondary"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 max-w-xs rounded-lg bg-charcoal px-3 py-2 text-xs leading-relaxed text-white shadow-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in"
          >
            {children}
            <Tooltip.Arrow className="fill-charcoal" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
