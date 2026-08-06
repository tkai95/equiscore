'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '@/lib/api'
import type { ConsumerGoal } from '@/lib/api'
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Home,
  Info,
  Plus,
  Share2,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { TierBadge } from '@/components/trust-score/tier-badge'
import {
  Button,
  buttonClasses,
  Card,
  InsetPanel,
  PageHeader,
  PageLayout,
  StatusPill,
} from '@/components/ui'

const TARGET_TYPE_LABELS: Record<string, string> = {
  landlord: 'Landlord',
  letting_agent: 'Letting agent',
  lender: 'Lender',
  employer: 'Employer',
  other: 'Other',
}

interface ShareLink {
  id: string
  shareToken: string
  targetType: string | null
  targetName: string | null
  expiresAt: string
  createdAt: string
  viewCount: number
  lastViewedAt: string | null
  trustScore: {
    overallTier: TrustTier
    overallScore: number
    computedAt: string
  }
}

interface TrustScoreBasic {
  id: string
  overallTier: TrustTier
  overallScore: number
  computedAt: string
}

type ShareMode = 'generic' | 'rental'

type InsightProfile = {
  period: { transactionCount: number; months: number }
  income: {
    averageMonthlyIncome: number
    consistency: string
  }
  affordability: {
    rating: 'comfortable' | 'manageable' | 'stretched' | 'at_risk'
    currentRent: number | null
    maxAffordableRent: number
    surplusAfterAll: number
    ratios: {
      rentToIncome: number | null
    }
  }
  paymentBehaviour: {
    rentPaidConsistently: boolean
    returnedPayments: number
    missedPayments: number
  }
  stability: {
    rentNeverMissed: boolean
    positiveMonthlySurplus: boolean
  }
}

type RentalSharePackPreview = {
  headline: string
  statusTone: 'success' | 'warning' | 'danger' | 'neutral'
  statusLabel: string
  targetRent: number | null
  monthlyIncome: number
  targetRentToIncome: number | null
  maxAffordableRent: number | null
  affordabilityHeadroom: number | null
  estimatedUpfrontCash: number | null
  depositAvailable: number
  upfrontCashGap: number | null
  monthsRemaining: number | null
  monthlyFundingRequired: number | null
  strengths: string[]
  watchouts: string[]
  missing: string[]
  assumptions: string[]
}

function monthsUntil(date: string | null | undefined) {
  if (!date) return null
  const target = new Date(date)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 0
  return Math.max(1, Math.ceil(days / 30))
}

function formatPercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 'Not available'
  return `${Math.round(value * 100)}%`
}

function formatMoneyOrDash(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 'Not available'
  return formatCurrency(value)
}

function buildRentalSharePackPreview(
  goal: ConsumerGoal | null | undefined,
  profile: InsightProfile | null | undefined
): RentalSharePackPreview | null {
  if (!goal || goal.type !== 'rental') return null

  const targetRent = goal.targetMonthlyRent ?? profile?.affordability.currentRent ?? null
  const monthlyIncome = profile?.income.averageMonthlyIncome ?? 0
  const targetRentToIncome =
    targetRent != null && monthlyIncome > 0 ? targetRent / monthlyIncome : null
  const maxAffordableRent = profile?.affordability.maxAffordableRent ?? null
  const affordabilityHeadroom =
    targetRent != null && maxAffordableRent != null ? maxAffordableRent - targetRent : null
  const estimatedUpfrontCash = targetRent != null ? Math.round(targetRent * 2.5) : null
  const depositAvailable = goal.depositAvailable ?? 0
  const upfrontCashGap =
    estimatedUpfrontCash != null ? Math.max(0, estimatedUpfrontCash - depositAvailable) : null
  const remainingMonths = monthsUntil(goal.moveDate)
  const monthlyFundingRequired =
    upfrontCashGap != null && remainingMonths != null && remainingMonths > 0
      ? Math.ceil(upfrontCashGap / remainingMonths)
      : null

  const strengths: string[] = []
  const watchouts: string[] = []
  const missing: string[] = []

  if (targetRent == null) missing.push('Add the target monthly rent before sharing.')
  if (!goal.moveDate) missing.push('Add the expected move date before sharing.')
  if (monthlyIncome <= 0) missing.push('Connect income evidence so affordability can be reviewed.')

  if (targetRentToIncome != null && targetRentToIncome <= 0.35) {
    strengths.push('Target rent appears within a typical rent-to-income range.')
  } else if (targetRentToIncome != null) {
    watchouts.push('Target rent may be high compared with verified monthly income.')
  }

  if (affordabilityHeadroom != null && affordabilityHeadroom >= 0) {
    strengths.push('Target rent is within the current estimated sustainable rent range.')
  } else if (affordabilityHeadroom != null) {
    watchouts.push('Target rent is above the current estimated sustainable rent range.')
  }

  if (profile?.paymentBehaviour.rentPaidConsistently || profile?.stability.rentNeverMissed) {
    strengths.push('Rent or rent-like payments appear consistent.')
  } else if (profile) {
    watchouts.push('Direct rent-payment reliability evidence is limited or not detected.')
  }

  if (upfrontCashGap != null && upfrontCashGap === 0) {
    strengths.push('Declared upfront cash appears to cover the planning estimate.')
  } else if (upfrontCashGap != null) {
    watchouts.push(
      'Declared upfront cash may not yet cover deposit, first month and moving buffer.'
    )
  }

  const hasEvidence = (profile?.period.transactionCount ?? 0) > 0
  const statusKey =
    !hasEvidence || missing.length > 0
      ? 'needs_detail'
      : watchouts.length > 0
        ? 'ready_with_conditions'
        : 'ready'

  return {
    headline:
      statusKey === 'ready'
        ? 'Rental pack looks ready to review'
        : statusKey === 'ready_with_conditions'
          ? 'Rental pack is reviewable with context'
          : 'Rental pack needs more detail',
    statusTone:
      statusKey === 'ready'
        ? 'success'
        : statusKey === 'ready_with_conditions'
          ? 'warning'
          : 'neutral',
    statusLabel:
      statusKey === 'ready'
        ? 'Ready'
        : statusKey === 'ready_with_conditions'
          ? 'Context needed'
          : 'Needs detail',
    targetRent,
    monthlyIncome,
    targetRentToIncome,
    maxAffordableRent,
    affordabilityHeadroom,
    estimatedUpfrontCash,
    depositAvailable,
    upfrontCashGap,
    monthsRemaining: remainingMonths,
    monthlyFundingRequired,
    strengths,
    watchouts,
    missing,
    assumptions: [
      'The upfront cash estimate uses 2.5x monthly rent for planning only.',
      'The share link freezes this evidence snapshot when the link is created.',
      'The pack supports a review; it does not guarantee a landlord or letting agent will accept the application.',
    ],
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={handleCopy} className={buttonClasses('secondary', 'sm')} title="Copy link">
      {copied ? (
        <Check className="text-success-strong h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

function CreateLinkForm({
  score,
  onCreate,
  onCancel,
  isPending,
  packType,
  goalId,
  initialTargetType = '',
  title = 'New share link',
  description,
  submitLabel = 'Create link',
}: {
  score: TrustScoreBasic
  onCreate: (data: {
    trustScoreId: string
    targetType?: string
    targetName?: string
    packType?: ShareMode
    goalId?: string
  }) => void
  onCancel: () => void
  isPending: boolean
  packType?: ShareMode
  goalId?: string
  initialTargetType?: string
  title?: string
  description?: string
  submitLabel?: string
}) {
  const [targetType, setTargetType] = useState(initialTargetType)
  const [targetName, setTargetName] = useState('')

  const inputClass =
    'w-full rounded-lg border border-line bg-surface-card px-3 py-2.5 text-sm text-content focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
  const labelClass = 'mb-1.5 block text-sm font-medium text-content-secondary'

  return (
    <InsetPanel padding="md" className="rounded-panel mt-4">
      <h3 className="text-content text-sm font-semibold">{title}</h3>
      {description ? <p className="text-content-muted mt-1 text-sm">{description}</p> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Recipient type (optional)</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className={inputClass}
          >
            <option value="">Select…</option>
            {Object.entries(TARGET_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Recipient name (optional)</label>
          <input
            type="text"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="e.g. John Smith Properties"
            className={inputClass}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            onCreate({
              trustScoreId: score.id,
              targetType: targetType || undefined,
              targetName: targetName || undefined,
              packType,
              goalId,
            })
          }
          loading={isPending}
        >
          {!isPending && <Share2 className="h-4 w-4" />}
          {isPending ? 'Creating…' : submitLabel}
        </Button>
      </div>
    </InsetPanel>
  )
}

function RentalSharePackPreviewCard({
  goal,
  preview,
  onCreate,
}: {
  goal: ConsumerGoal
  preview: RentalSharePackPreview
  onCreate: () => void
}) {
  const moveDate = goal.moveDate ? formatDate(goal.moveDate) : 'Not set'
  const applicationMode =
    goal.applicationMode === 'joint'
      ? 'Joint application'
      : goal.applicationMode === 'alone'
        ? 'Applying alone'
        : 'Not sure yet'

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Home className="text-brand-900 h-4 w-4" />
            <p className="text-brand-900 text-xs font-semibold uppercase tracking-wide">
              Rental readiness pack
            </p>
          </div>
          <h2 className="text-content text-xl font-semibold">{preview.headline}</h2>
          <p className="text-content-secondary mt-1 max-w-3xl text-sm">
            This is the goal-specific view a landlord or letting agent will see when this share link
            is opened. It uses the saved rental goal and freezes the evidence snapshot when the link
            is created.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={preview.statusTone} label={preview.statusLabel} />
          <Button onClick={onCreate}>
            <Share2 className="h-4 w-4" />
            Create rental pack link
          </Button>
        </div>
      </div>

      <InsetPanel padding="md" className="rounded-panel">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-content-muted flex items-center gap-1.5 text-xs font-semibold uppercase">
              <Banknote className="h-3.5 w-3.5" />
              Target rent
            </p>
            <p className="text-content mt-1 text-lg font-semibold">
              {formatMoneyOrDash(preview.targetRent)}
            </p>
          </div>
          <div>
            <p className="text-content-muted flex items-center gap-1.5 text-xs font-semibold uppercase">
              <CalendarClock className="h-3.5 w-3.5" />
              Move date
            </p>
            <p className="text-content mt-1 text-lg font-semibold">{moveDate}</p>
          </div>
          <div>
            <p className="text-content-muted text-xs font-semibold uppercase">Application</p>
            <p className="text-content mt-1 text-lg font-semibold">{applicationMode}</p>
          </div>
          <div>
            <p className="text-content-muted text-xs font-semibold uppercase">Link type</p>
            <p className="text-content mt-1 text-lg font-semibold">Recipient review</p>
          </div>
        </div>
      </InsetPanel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-surface-inset rounded-xl px-4 py-3">
          <p className="text-content-muted text-xs">Rent to verified income</p>
          <p className="text-content mt-1 text-xl font-semibold tabular-nums">
            {formatPercent(preview.targetRentToIncome)}
          </p>
          <p className="text-content-muted mt-0.5 text-[11px]">
            Based on {formatMoneyOrDash(preview.monthlyIncome)}/mo income
          </p>
        </div>
        <div className="bg-surface-inset rounded-xl px-4 py-3">
          <p className="text-content-muted text-xs">Estimated sustainable rent</p>
          <p className="text-content mt-1 text-xl font-semibold tabular-nums">
            {formatMoneyOrDash(preview.maxAffordableRent)}
          </p>
          <p className="text-content-muted mt-0.5 text-[11px]">
            Headroom {formatMoneyOrDash(preview.affordabilityHeadroom)}
          </p>
        </div>
        <div className="bg-surface-inset rounded-xl px-4 py-3">
          <p className="text-content-muted text-xs">Estimated upfront cash</p>
          <p className="text-content mt-1 text-xl font-semibold tabular-nums">
            {formatMoneyOrDash(preview.estimatedUpfrontCash)}
          </p>
          <p className="text-content-muted mt-0.5 text-[11px]">
            Declared {formatMoneyOrDash(preview.depositAvailable)}
          </p>
        </div>
        <div className="bg-surface-inset rounded-xl px-4 py-3">
          <p className="text-content-muted text-xs">Cash gap</p>
          <p className="text-content mt-1 text-xl font-semibold tabular-nums">
            {formatMoneyOrDash(preview.upfrontCashGap)}
          </p>
          <p className="text-content-muted mt-0.5 text-[11px]">
            {preview.monthlyFundingRequired != null
              ? `${formatCurrency(preview.monthlyFundingRequired)}/mo to close`
              : 'Add move date for monthly need'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-content mb-3 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="text-success-strong h-4 w-4" />
            What supports this pack
          </h3>
          {preview.strengths.length > 0 ? (
            <div className="space-y-2">
              {preview.strengths.map((item) => (
                <div key={item} className="text-content-secondary flex items-start gap-2 text-sm">
                  <CheckCircle2 className="text-success-strong mt-0.5 h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-content-muted text-sm">No strong rental-specific signals yet.</p>
          )}
        </div>
        <div>
          <h3 className="text-content mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="text-warning-strong h-4 w-4" />
            What needs context
          </h3>
          {[...preview.missing, ...preview.watchouts].length > 0 ? (
            <div className="space-y-2">
              {[...preview.missing, ...preview.watchouts].map((item) => (
                <div key={item} className="text-content-secondary flex items-start gap-2 text-sm">
                  <AlertTriangle className="text-warning-strong mt-0.5 h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-content-muted text-sm">
              No major watchouts from the current evidence.
            </p>
          )}
        </div>
      </div>

      <InsetPanel className="rounded-panel flex items-start gap-3">
        <Info className="text-brand-900 mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-content text-sm font-semibold">Recipient limitations</p>
          <ul className="text-content-secondary mt-2 space-y-1 text-sm">
            {preview.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      </InsetPanel>
    </Card>
  )
}

export function ShareProfileView({
  mode = 'generic',
  goalId,
}: {
  mode?: ShareMode
  goalId?: string
}) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const isRentalMode = mode === 'rental'

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env['NEXT_PUBLIC_APP_URL'] ?? '')

  const { data: score, isLoading: scoreLoading } = useQuery({
    queryKey: ['score', 'general'],
    queryFn: async () => {
      const token = await getToken()
      return api.scores.latest(token!, 'general') as Promise<TrustScoreBasic | null>
    },
  })

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const token = await getToken()
      return api.goals.list(token!)
    },
    enabled: isRentalMode,
  })

  const { data: insightProfile = null, isLoading: insightLoading } = useQuery({
    queryKey: ['insight-profile'],
    queryFn: async () => {
      const token = await getToken()
      return api.insights.getProfile(token!) as Promise<InsightProfile | null>
    },
    enabled: isRentalMode,
  })

  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['share-links'],
    queryFn: async () => {
      const token = await getToken()
      return api.sharing.list(token!) as Promise<ShareLink[]>
    },
  })

  const selectedRentalGoal = useMemo(() => {
    if (!isRentalMode) return null
    return (
      goals.find((goal) => goal.id === goalId && goal.type === 'rental') ??
      goals.find((goal) => goal.type === 'rental' && goal.status === 'active' && goal.isPrimary) ??
      goals.find((goal) => goal.type === 'rental' && goal.status === 'active') ??
      null
    )
  }, [goalId, goals, isRentalMode])

  const rentalPackPreview = useMemo(
    () => buildRentalSharePackPreview(selectedRentalGoal, insightProfile),
    [insightProfile, selectedRentalGoal]
  )

  const createMutation = useMutation({
    mutationFn: async (data: {
      trustScoreId: string
      targetType?: string
      targetName?: string
      packType?: ShareMode
      goalId?: string
    }) => {
      const token = await getToken()
      return api.sharing.create(token!, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['share-links'] })
      setShowForm(false)
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      return api.sharing.revoke(token!, id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['share-links'] })
    },
  })

  const isLoading =
    scoreLoading || linksLoading || (isRentalMode && (goalsLoading || insightLoading))

  return (
    <PageLayout>
      <PageHeader title={isRentalMode ? 'Rental share pack' : 'Sharing'} />

      {/* Score required gate */}
      {!isLoading && !score && (
        <Card className="text-center" padding="lg">
          <ShieldCheck className="text-warning-strong mx-auto mb-3 h-8 w-8" />
          <p className="text-content font-semibold">Generate your trust score first</p>
          <p className="text-content-secondary mx-auto mt-1 max-w-md text-sm">
            You need an active trust score before you can create shareable links.
          </p>
          <a
            href="/dashboard/trust-profile/assessment"
            className={buttonClasses('primary', 'md', 'mt-4')}
          >
            Go to Assessment
          </a>
        </Card>
      )}

      {!isLoading && score && isRentalMode && !selectedRentalGoal && (
        <Card className="text-center" padding="lg">
          <Home className="text-brand-900 mx-auto mb-3 h-8 w-8" />
          <p className="text-content font-semibold">Create a rental goal first</p>
          <p className="text-content-secondary mx-auto mt-1 max-w-md text-sm">
            Rental share packs use your saved target rent, move date and deposit context.
          </p>
          <a href="/dashboard/goals" className={buttonClasses('primary', 'md', 'mt-4')}>
            Open Goals
          </a>
        </Card>
      )}

      {score && selectedRentalGoal && rentalPackPreview && (
        <RentalSharePackPreviewCard
          goal={selectedRentalGoal}
          preview={rentalPackPreview}
          onCreate={() => setShowForm(true)}
        />
      )}

      {/* Create link button + form */}
      {score && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-content font-semibold">
                {isRentalMode ? 'Create the rental pack link' : 'Create a new link'}
              </h2>
              <p className="text-content-muted mt-0.5 text-sm">
                {isRentalMode
                  ? 'The link will include the rental pack context above and expire after 30 days.'
                  : 'Links expire after 30 days.'}
              </p>
            </div>
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                className="shrink-0"
                disabled={isRentalMode && !selectedRentalGoal}
              >
                <Plus className="h-4 w-4" />
                {isRentalMode ? 'Pack link' : 'New link'}
              </Button>
            )}
          </div>

          {showForm && (
            <CreateLinkForm
              score={score}
              onCreate={(data) => createMutation.mutate(data)}
              onCancel={() => setShowForm(false)}
              isPending={createMutation.isPending}
              packType={isRentalMode ? 'rental' : undefined}
              goalId={isRentalMode ? selectedRentalGoal?.id : undefined}
              initialTargetType={isRentalMode ? 'letting_agent' : ''}
              title={isRentalMode ? 'Rental pack recipient' : 'New share link'}
              description={
                isRentalMode
                  ? 'Use the recipient fields to label who this rental pack is intended for.'
                  : undefined
              }
              submitLabel={isRentalMode ? 'Create rental pack link' : 'Create link'}
            />
          )}
          {createMutation.isError && (
            <p className="text-danger-strong mt-3 text-sm">
              Failed — {(createMutation.error as Error).message}
            </p>
          )}
        </Card>
      )}

      {/* Links list */}
      {linksLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-card bg-surface-hover h-24 animate-pulse" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-14">
          <div className="rounded-panel bg-surface-inset flex h-14 w-14 items-center justify-center">
            <Share2 className="text-brand-900 h-7 w-7" />
          </div>
          <p className="text-content-muted text-sm">No share links yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-content font-semibold">Active links</h2>
          {links.map((link) => {
            const shareUrl = `${appUrl}/share/${link.shareToken}`
            const expired = new Date(link.expiresAt) < new Date()
            return (
              <Card key={link.id} padding="sm" className={cn(expired && 'opacity-60')}>
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {link.targetName && (
                        <span className="text-content text-sm font-medium">{link.targetName}</span>
                      )}
                      {link.targetType && (
                        <StatusPill
                          status="neutral"
                          label={TARGET_TYPE_LABELS[link.targetType] ?? link.targetType}
                        />
                      )}
                      <TierBadge tier={link.trustScore.overallTier} />
                      <span className="text-content-muted text-xs font-medium tabular-nums">
                        {link.trustScore.overallScore} / 100
                      </span>
                      {expired && <StatusPill status="danger" label="Expired" />}
                    </div>
                    <p className="text-content-muted mt-1 truncate font-mono text-xs">{shareUrl}</p>
                    <p className="text-content-muted mt-1 text-xs">
                      Created {formatDate(link.createdAt)} · Expires {formatDate(link.expiresAt)}
                      {link.viewCount > 0 &&
                        ` · ${link.viewCount} view${link.viewCount > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <CopyButton text={shareUrl} />
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses('secondary', 'sm')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview
                    </a>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeMutation.mutate(link.id)}
                      disabled={revokeMutation.isPending || expired}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}
