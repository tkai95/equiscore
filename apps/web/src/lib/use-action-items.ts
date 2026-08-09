'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useImportProcessing } from '@/lib/use-import-state'

/**
 * Single source of truth for the user's outstanding actions.
 *
 * The sidebar badge, the To do page and the dashboard's recommended
 * action all read from here so the count and the list can never disagree.
 * Actions are ordered by priority (identity/verification first, then evidence,
 * then freshness), which matches how the assessment is capped.
 */

export interface ActionItem {
  id: string
  title: string
  detail: string
  href: string
  cta: string
  priority: number
}

type Score = {
  overallScore: number
  identityConfidenceScore: number
  verificationStrengthScore: number
  incomeStabilityScore: number
  reasonCodes: Array<{ code: string; sentiment: string; message: string }>
  status?: string
} | null

type Profile = { profileStage?: string; fullName?: string } | null
type Account = { bankConnection: { connectionStatus: string } }
type Doc = { documentType: string; verificationStatus: string }
type Insight = {
  period: { transactionCount: number }
  income?: { incomeIsVariable?: boolean; primaryConfirmed?: boolean }
} | null

const IDENTITY_DOC_TYPES = [
  'passport',
  'national_id',
  'driving_licence',
  'biometric_residence_permit',
]

export function useActionItems() {
  const { getToken } = useAuth()
  const isImporting = useImportProcessing()

  const { data: score, isLoading: l1 } = useQuery({
    queryKey: ['score', 'general'],
    queryFn: async () => api.scores.latest((await getToken())!, 'general') as Promise<Score>,
  })
  const { data: accounts = [], isLoading: l2 } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => api.banking.getAccounts((await getToken())!) as Promise<Account[]>,
  })
  const { data: documents = [], isLoading: l3 } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => api.documents.list((await getToken())!) as Promise<Doc[]>,
  })
  const { data: insight } = useQuery({
    queryKey: ['insight-profile'],
    enabled: accounts.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => api.insights.getProfile((await getToken())!) as Promise<Insight>,
  })

  const items: ActionItem[] = []

  const hasBank = accounts.some((a) => a.bankConnection.connectionStatus === 'active')
  const hasAnyBank = accounts.length > 0
  const hasIdentityDoc = documents.some(
    (d) => IDENTITY_DOC_TYPES.includes(d.documentType) && d.verificationStatus !== 'rejected',
  )

  if (!hasAnyBank) {
    items.push({
      id: 'upload-statement',
      title: 'Upload a bank statement',
      detail:
        'Upload a PDF or CSV bank statement so we can read your income, rent and spending and build your Trust Profile.',
      href: '/dashboard/connections',
      cta: 'Upload statement',
      priority: 1,
    })
  }

  // Identity verification — the most common cap on the assessment.
  if (score && score.identityConfidenceScore < 60 && !hasIdentityDoc) {
    items.push({
      id: 'verify-identity',
      title: 'Complete identity verification',
      detail:
        'Confirm your name and date of birth with a passport or driving licence to resolve the main verification gap.',
      href: '/dashboard/documents',
      cta: 'Verify identity',
      priority: 2,
    })
  }

  // Name mismatch flagged by the scoring engine.
  if (score?.reasonCodes.some((r) => r.code === 'NAME_MISMATCH')) {
    items.push({
      id: 'name-mismatch',
      title: 'Explain an account name mismatch',
      detail:
        'The name on an account does not fully match your profile. Review it so it does not limit your confidence.',
      href: '/dashboard/connections',
      cta: 'Review mismatch',
      priority: 3,
    })
  }

  // Income confirmation.
  if (score && hasBank && (score.incomeStabilityScore < 50 || insight?.income?.incomeIsVariable)) {
    items.push({
      id: 'review-income',
      title: 'Review your income source',
      detail:
        'Your income varies month to month or the primary source is unconfirmed. Reviewing it strengthens the assessment.',
      href: '/dashboard/trust-profile/financial-profile',
      cta: 'Review income',
      priority: 4,
    })
  }

  // Supporting evidence.
  if (documents.length === 0 && hasAnyBank) {
    items.push({
      id: 'add-document',
      title: 'Add a supporting document',
      detail: 'A payslip, proof of address or ID adds verified evidence to your portfolio.',
      href: '/dashboard/documents',
      cta: 'Upload document',
      priority: 5,
    })
  }

  // Stale financial data.
  if (score?.status && score.status !== 'current') {
    items.push({
      id: 'refresh-data',
      title: 'Refresh your financial data',
      detail: 'This assessment is based on evidence that is no longer current. Upload a more recent statement to update it.',
      href: '/dashboard/connections',
      cta: 'Refresh data',
      priority: 6,
    })
  }

  items.sort((a, b) => a.priority - b.priority)

  // While a statement is being read in the background, the "Upload a bank
  // statement" action is no longer outstanding — hide it so the To do list,
  // sidebar badge and dashboard recommended-action don't nag during processing.
  const visible = isImporting ? items.filter((i) => i.id !== 'upload-statement') : items

  return { items: visible, count: visible.length, isLoading: l1 || l2 || l3 }
}
