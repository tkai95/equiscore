'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api, type ImportJob } from '@/lib/api'

/**
 * Shared source of truth for statement-import jobs. Both the upload card and the
 * global completion chip read this one query key, so they stay in sync off a
 * single request. It self-polls only while a job is still processing, then goes
 * quiet — a completed job survives navigation and browser restarts because the
 * status lives in the DB, not in component state.
 */
export function useImportJobs() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['import-jobs'],
    queryFn: async (): Promise<ImportJob[]> => {
      const token = await getToken()
      return api.insights.listImportJobs(token!)
    },
    staleTime: 15_000,
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.status === 'processing') ? 3500 : false,
  })
}
