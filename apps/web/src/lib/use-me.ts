'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api, type Me } from '@/lib/api'

/** Current user row, incl. the `compassEnabled` entitlement flag. */
export function useMe() {
  const { getToken } = useAuth()
  return useQuery<Me | null>({
    queryKey: ['me'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => api.auth.me((await getToken())!),
  })
}
