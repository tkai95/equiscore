'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FaqSection } from '@/lib/content/faq'

// Accordion for a single FAQ section. Light-theme, app-shell styling.
export function FaqAccordion({ section }: { section: FaqSection }) {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-900">
        {section.category}
      </p>
      <div className="rounded-card border border-line bg-surface-card">
        {section.items.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line-subtle last:border-0">
      <button
        className="flex w-full items-start justify-between gap-6 px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-content">{q}</span>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-brand-900 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <p className="px-5 pb-4 text-sm leading-relaxed text-content-secondary">{a}</p>}
    </div>
  )
}
