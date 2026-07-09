'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, XCircle, X } from 'lucide-react'
import { useImportJobs } from '@/lib/use-import-jobs'

const DISMISS_KEY = 'equiscore.dismissedImportJobs'
// A completed/failed job shows as a fresh notification for a while after it
// finishes, so a slow read that lands while you're on another page isn't missed.
const RECENT_MS = 30 * 60 * 1000

function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/**
 * Global "analysis complete" chip. Mounted in the dashboard header so it shows on
 * every page: the user can start a statement import on Connections, navigate away
 * or close the tab, and still get the ✓ (with a link to their insights) whenever
 * the background read finishes. It also refreshes every score-derived view the
 * moment a job completes.
 */
export function ImportJobsChip() {
  const { data: jobs = [] } = useImportJobs()
  const queryClient = useQueryClient()
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed())
  const reacted = useRef<Set<string>>(new Set())

  // When a job newly completes, everything derived from bank data is now stale.
  useEffect(() => {
    for (const j of jobs) {
      if (j.status === 'completed' && !reacted.current.has(j.id)) {
        reacted.current.add(j.id)
        for (const key of [
          ['score'],
          ['analytics-summary'],
          ['insight-profile'],
          ['bank-accounts'],
          ['accounts'],
        ]) {
          void queryClient.invalidateQueries({ queryKey: key })
        }
      }
    }
  }, [jobs, queryClient])

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]))
      } catch {
        /* storage unavailable — the chip just won't persist dismissal */
      }
      return next
    })
  }

  const processing = jobs.find((j) => j.status === 'processing')

  const now = Date.now()
  const done = jobs
    .filter((j) => j.status === 'completed' || j.status === 'failed')
    .filter((j) => !dismissed.has(j.id))
    .filter((j) => j.completedAt && now - new Date(j.completedAt).getTime() < RECENT_MS)
    .sort(
      (a, b) => new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime()
    )[0]

  if (processing) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-charcoal-mid shadow-sm ring-1 ring-[#D8D6C9]">
        <Loader2 className="h-4 w-4 animate-spin text-brand" />
        <span>Reading your statement…</span>
      </div>
    )
  }

  if (done?.status === 'completed') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>
          Statement analysed
          {done.result ? ` — ${done.result.overallTier} / ${done.result.overallScore}` : ''}
        </span>
        <Link
          href="/dashboard/analytics"
          onClick={() => dismiss(done.id)}
          className="font-semibold underline underline-offset-2 hover:text-emerald-900"
        >
          View insights
        </Link>
        <button
          onClick={() => dismiss(done.id)}
          className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-100"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  if (done?.status === 'failed') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 ring-1 ring-red-200">
        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
        <span className="max-w-[18rem] truncate">
          {done.error ?? "Couldn't read that statement"}
        </span>
        <button
          onClick={() => dismiss(done.id)}
          className="ml-0.5 rounded-full p-0.5 hover:bg-red-100"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return null
}
