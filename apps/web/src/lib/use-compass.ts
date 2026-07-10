'use client'

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Compass write actions. Each invalidates the ['compass'] query on success. */
export function useCompassActions() {
  const { getToken } = useAuth()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['compass'] })
  const onError = (e: unknown) => console.error('Compass action failed', e)
  const tok = async () => (await getToken())!

  const confirmCommitment = useMutation({
    mutationFn: async (v: {
      key: string
      status: 'active' | 'inactive' | 'unknown'
      name?: string
      renewalDate?: string
      remind?: boolean
    }) => api.compass.confirmCommitment(await tok(), v.key, v),
    onSuccess: invalidate,
    onError,
  })

  const updateReminder = useMutation({
    mutationFn: async (v: { id: string; status: 'completed' | 'dismissed' }) =>
      api.compass.updateReminder(await tok(), v.id, v.status),
    onSuccess: invalidate,
    onError,
  })

  const upsertGoal = useMutation({
    mutationFn: async (v: {
      type?: string
      label?: string
      targetAmount: number
      targetMonths?: number
      monthlyContribution?: number
    }) => api.compass.upsertGoal(await tok(), v),
    onSuccess: invalidate,
    onError,
  })

  const archiveGoal = useMutation({
    mutationFn: async (id: string) => api.compass.archiveGoal(await tok(), id),
    onSuccess: invalidate,
    onError,
  })

  const dismissOpportunity = useMutation({
    mutationFn: async (id: string) => api.compass.dismissOpportunity(await tok(), id),
    onSuccess: invalidate,
    onError,
  })

  return { confirmCommitment, updateReminder, upsertGoal, archiveGoal, dismissOpportunity }
}

export type CompassActions = ReturnType<typeof useCompassActions>
