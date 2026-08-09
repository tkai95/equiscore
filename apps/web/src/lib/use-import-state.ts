'use client'

import { useImportJobs } from './use-import-jobs'

/**
 * Whether the user has a statement import currently processing. The "dumb"
 * upload CTAs (Dashboard, Trust, To do, Compass, Analytics) read this so they
 * stop nagging "Upload a statement" the moment a background read is running —
 * only the chip and the Connections page need the full job list, so this hook
 * collapses it to the single boolean those surfaces care about.
 */
export function useImportProcessing(): boolean {
  const { data: jobs = [] } = useImportJobs()
  return jobs.some((j) => j.status === 'processing')
}
