'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { RefreshCw, AlertTriangle, Clock, ArrowRight, ChevronRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { api, type ScoreImprovements } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import {
  Button,
  buttonClasses,
  Card,
  Display,
  Drawer,
  InsetPanel,
  Metric,
  MetricGroup,
  PageHeader,
  PageLayout,
  Section,
  StatusPill,
  type StatusTone,
} from '@/components/ui'

type ScoreDisplayStatus = 'current' | 'expiring_soon' | 'expired' | 'evidence_withdrawn' | 'insufficient_evidence'

interface TrustScoreData {
  id: string
  overallScore: number
  overallTier: TrustTier
  profileCompletenessScore: number
  verificationStrengthScore: number
  identityConfidenceScore: number
  incomeStabilityScore: number
  affordabilityScore: number
  rentalReliabilityScore: number
  financialStabilityScore: number
  fraudRisk: string
  reasonCodes: Array<{ code: string; dimension: string; sentiment: string; message: string; weight: number }>
  computedAt: string
  status?: ScoreDisplayStatus
  isCurrent?: boolean
  financialDataAsOf?: string | null
  validUntil?: string | null
}

type ProfileMeta = {
  period: { months: number; transactionCount: number }
  source: 'open_banking' | 'statement_upload' | 'test'
} | null

const TIER_HEX: Record<TrustTier, string> = {
  A: '#123C35',
  B: '#3D6658',
  C: '#8FA491',
  D: '#C7A66A',
  E: '#A96E52',
}

type DimKey =
  | 'affordabilityScore'
  | 'incomeStabilityScore'
  | 'financialStabilityScore'
  | 'rentalReliabilityScore'
  | 'identityConfidenceScore'
  | 'verificationStrengthScore'
  | 'profileCompletenessScore'

const DIM_LABELS: Record<DimKey, string> = {
  affordabilityScore: 'Affordability',
  incomeStabilityScore: 'Income stability',
  financialStabilityScore: 'Financial stability',
  rentalReliabilityScore: 'Rental reliability',
  identityConfidenceScore: 'Identity confidence',
  verificationStrengthScore: 'Verification strength',
  profileCompletenessScore: 'Profile completeness',
}

const FINANCIAL_DIMS: DimKey[] = [
  'affordabilityScore',
  'incomeStabilityScore',
  'financialStabilityScore',
  'rentalReliabilityScore',
]
const VERIFICATION_DIMS: DimKey[] = ['identityConfidenceScore', 'verificationStrengthScore']

const DIM_META: Record<DimKey, { assessed: string[]; improve: string[] }> = {
  affordabilityScore: {
    assessed: ['Disposable income after essential costs', 'Rent as a share of take-home income', 'Overdraft usage and month-end balances'],
    improve: ['Reduce discretionary spending', 'Keep rent below ~35% of take-home income'],
  },
  incomeStabilityScore: {
    assessed: ['Number of income sources', 'Month-to-month income variance', 'Whether a recurring salary is detected'],
    improve: ['Connect additional income accounts', 'Classify transfers that represent income', 'A longer history reduces apparent volatility'],
  },
  financialStabilityScore: {
    assessed: ['Positive month-end balances', 'Savings buffer relative to spending', 'Absence of overdraft dependency'],
    improve: ['Maintain a positive month-end balance', 'Build a small savings buffer'],
  },
  rentalReliabilityScore: {
    assessed: ['Whether rent is detected and paid consistently', 'Returned or missed payments', 'Reliability of essential bill payments'],
    improve: ['Ensure rent is paid from the connected account', 'Explain any flagged rent-like transfers on Financial insights'],
  },
  identityConfidenceScore: {
    assessed: ['Match between your name and the bank account holder', 'Address confidence from evidence'],
    improve: ['Set your profile name to your legal name as it appears at the bank', 'Reconnect the correct account, or upload proof of ID / address'],
  },
  verificationStrengthScore: {
    assessed: ['Whether evidence is Open Banking (strongest) or an uploaded statement', 'Number of verified sources', 'Uploaded documents'],
    improve: ['Connect a bank via Open Banking', 'Upload an ID or proof of address'],
  },
  profileCompletenessScore: {
    assessed: ['Profile fields completed (name, DOB, nationality, residency, employment)'],
    improve: ['Complete the remaining profile fields'],
  },
}

const SOURCE_LABEL: Record<string, string> = {
  open_banking: 'Open Banking',
  statement_upload: 'Uploaded statement',
  test: 'Sample data',
}

function assessment(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Strong'
  if (score >= 55) return 'Moderate'
  if (score >= 40) return 'Limited'
  if (score >= 1) return 'Weak'
  return 'Not verified'
}

/** Score → status label, semantic pill tone, and a brand-derived bar colour. */
function band(score: number): { label: string; tone: StatusTone; bar: string } {
  if (score >= 70) return { label: 'Strong', tone: 'success', bar: 'bg-chart-2' }
  if (score >= 50) return { label: 'Review', tone: 'neutral', bar: 'bg-chart-3' }
  if (score >= 30) return { label: 'Improve', tone: 'warning', bar: 'bg-chart-5' }
  return { label: 'Action', tone: 'warning', bar: 'bg-chart-6' }
}

const DIM_CAMEL: Record<string, string> = {
  profileCompleteness: 'Profile completeness',
  verificationStrength: 'Verification strength',
  identityConfidence: 'Identity confidence',
  incomeStability: 'Income stability',
  affordability: 'Affordability',
  rentalReliability: 'Rental reliability',
  financialStability: 'Financial stability',
}

export function TrustScoreView() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [drawerDim, setDrawerDim] = useState<DimKey | null>(null)

  const { data: score, isLoading } = useQuery({
    queryKey: ['score', 'general'],
    queryFn: async () => {
      const token = await getToken()
      return api.scores.latest(token!, 'general') as Promise<TrustScoreData | null>
    },
  })

  const { data: improvements } = useQuery<ScoreImprovements>({
    queryKey: ['score-improvements'],
    enabled: !!score,
    queryFn: async () => {
      const token = await getToken()
      return api.scores.improvements(token!, 'general')
    },
  })

  const { data: profileMeta } = useQuery<ProfileMeta>({
    queryKey: ['insight-profile'],
    enabled: !!score,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const token = await getToken()
      return api.insights.getProfile(token!) as Promise<ProfileMeta>
    },
  })

  const recompute = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return api.scores.recompute(token!, 'general')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['score'] })
      queryClient.invalidateQueries({ queryKey: ['score-improvements'] })
    },
  })

  if (isLoading) {
    return (
      <PageLayout>
        <div className="h-8 w-56 animate-pulse rounded bg-surface-inset" />
        <div className="h-56 animate-pulse rounded-2xl bg-surface-inset" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface-inset" />
      </PageLayout>
    )
  }

  if (!score) {
    return (
      <PageLayout>
        <PageHeader title="Assessment" />
        <Card className="text-center" padding="lg">
          <p className="font-semibold text-content">No assessment yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-content-secondary">
            Your Trust Portfolio is built from real financial evidence. Connect a bank or upload a statement, then
            generate your assessment.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard/connections" className={buttonClasses('primary')}>
              Add your bank data
            </Link>
            <Button variant="secondary" loading={recompute.isPending} onClick={() => recompute.mutate()}>
              {recompute.isPending ? 'Generating…' : 'Generate assessment'}
            </Button>
          </div>
        </Card>
      </PageLayout>
    )
  }

  const capped = score.reasonCodes.some((r) => r.code === 'FOUNDATION_CAP')
  const financialAvg = Math.round(FINANCIAL_DIMS.reduce((s, k) => s + (score[k] as number), 0) / FINANCIAL_DIMS.length)
  const verificationWeak = score.identityConfidenceScore < 50 || score.verificationStrengthScore < 50
  const nameMismatch = score.reasonCodes.some((r) => r.code === 'NAME_MISMATCH')
  const financiallyStrong = financialAvg >= 60
  const decision = verificationWeak
    ? financiallyStrong
      ? 'Financially strong. Verification incomplete.'
      : 'Verification incomplete.'
    : financiallyStrong
      ? 'Financially strong and verified.'
      : 'Assessment complete.'
  const financialRating = assessment(financialAvg)

  const primary =
    improvements?.improvements.find((i) => i.dimension === 'Identity Confidence') ??
    improvements?.improvements.find((i) => i.dimension === 'Verification Strength') ??
    improvements?.improvements[0]

  const strengths = score.reasonCodes.filter((r) => r.sentiment === 'positive').sort((a, b) => b.weight - a.weight)
  const limiting = score.reasonCodes
    .filter((r) => r.sentiment !== 'positive')
    .sort((a, b) => {
      if (a.sentiment !== b.sentiment) return a.sentiment === 'negative' ? -1 : 1
      return b.weight - a.weight
    })

  return (
    <PageLayout className="pb-4">
      <PageHeader
        title="Assessment"
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Last assessed {formatDate(score.computedAt)}</span>
            {score.validUntil && (
              <span className="border-l border-line pl-4">Valid until {formatDate(score.validUntil)}</span>
            )}
            {profileMeta && <span className="border-l border-line pl-4">{profileMeta.period.months}-month coverage</span>}
            {profileMeta && (
              <span className="border-l border-line pl-4">
                Source: {SOURCE_LABEL[profileMeta.source] ?? profileMeta.source}
              </span>
            )}
          </span>
        }
        actions={
          <>
            <Link href="/dashboard/share" className={buttonClasses('secondary')}>
              Share portfolio
            </Link>
            <Button variant="secondary" loading={recompute.isPending} onClick={() => recompute.mutate()}>
              {!recompute.isPending && <RefreshCw className="h-4 w-4" />}
              {recompute.isPending ? 'Recalculating…' : 'Recalculate'}
            </Button>
          </>
        }
      />

      {/* Freshness notice */}
      {score.status && score.status !== 'current' && (
        <div className="flex items-start gap-3 rounded-xl bg-warning-soft px-5 py-3.5">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning-strong" />
          <p className="text-sm text-warning-strong">
            This assessment is based on financial evidence that is no longer current. Refresh your bank data or upload a
            newer statement to bring it up to date.
          </p>
        </div>
      )}

      {/* ── Assessment summary (the one true hero card) ─────────────────────── */}
      <Card padding="lg">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <div className="flex flex-col items-center justify-center border-b border-line-subtle pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <AnimatedGauge score={score.overallScore} tier={score.overallTier} />
            <Display size="md" className="mt-2">
              Trust Tier {score.overallTier}
            </Display>
          </div>

          <div className="flex flex-col justify-center">
            <Display size="md">{decision}</Display>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-content-secondary">
              {verificationWeak
                ? `Your profile is currently limited to Tier ${score.overallTier} because your identity and evidence could not be fully verified${financiallyStrong ? ', even though your financial behaviour is strong' : ''}. Verifying unlocks a higher tier.`
                : 'Your financial behaviour and verified evidence support this assessment.'}
            </p>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              <SummaryRow label="Financial assessment" value={financialRating} tone={financialAvg >= 55 ? 'success' : 'warning'} />
              <SummaryRow
                label="Identity verification"
                value={verificationWeak ? 'Action required' : 'Verified'}
                tone={verificationWeak ? 'warning' : 'success'}
              />
            </div>

            {primary && (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link href={primary.href} className={buttonClasses('primary', 'lg')}>
                  {verificationWeak ? 'Resolve verification' : primary.title}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
                <Link href="/dashboard/analytics" className="text-sm font-medium text-brand-900 hover:underline">
                  View how scoring works
                </Link>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Action banner */}
      {verificationWeak && (
        <div className="flex flex-col gap-3 rounded-2xl bg-warning-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-strong" />
            <div>
              <p className="font-semibold text-warning-strong">Complete verification to unlock a higher tier</p>
              <p className="mt-0.5 text-sm text-warning-strong/90">
                {nameMismatch
                  ? 'The name connected to your bank account does not fully match your EquiScore profile. Resolving this raises your verification confidence.'
                  : score.identityConfidenceScore < 50
                    ? 'Add a government photo ID so we can verify your identity — the biggest lever on your tier. A verified ID confirms your name and date of birth.'
                    : 'Your evidence is statement-only. Connecting Open Banking or adding a document strengthens verification.'}
              </p>
            </div>
          </div>
          {primary && (
            <Link href={primary.href} className={buttonClasses('primary', 'sm', 'shrink-0')}>
              Review details
            </Link>
          )}
        </div>
      )}

      {/* ── Financial assessment ───────────────────────────────────────────── */}
      <Section title="Financial assessment" action={<span className="text-sm text-content-muted">Quality of financial behaviour</span>}>
        <DimensionList dims={FINANCIAL_DIMS} score={score} onOpen={setDrawerDim} />
      </Section>

      {/* ── Verification & confidence ──────────────────────────────────────── */}
      <Section title="Verification & confidence" action={<span className="text-sm text-content-muted">Confidence in the evidence</span>}>
        {capped && (
          <InsetPanel className="flex items-start gap-2 text-sm text-content-secondary">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-900" />
            Your financial assessment ({financialRating.toLowerCase()}) supports a stronger profile. Your trust tier is
            capped at C until verification is completed.
          </InsetPanel>
        )}
        <DimensionList dims={VERIFICATION_DIMS} score={score} onOpen={setDrawerDim} />
        <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
          <span className="text-content-secondary">Profile completeness</span>
          <span className="font-semibold tabular-nums text-content">{score.profileCompletenessScore}%</span>
        </div>
      </Section>

      {/* ── Key assessment findings (report columns, no boxes) ─────────────── */}
      <Section title="Key assessment findings">
        <div className="grid gap-8 sm:grid-cols-2">
          <FindingsColumn title="Strengths" tone="good" items={strengths} />
          <FindingsColumn title="Factors limiting your profile" tone="warn" items={limiting} />
        </div>
      </Section>

      {/* ── Evidence & methodology ─────────────────────────────────────────── */}
      <Section title="Evidence & methodology">
        <MetricGroup>
          <Metric label="Data coverage" value={profileMeta ? `${profileMeta.period.months} months` : '—'} />
          <Metric label="Primary source" value={profileMeta ? SOURCE_LABEL[profileMeta.source] ?? profileMeta.source : '—'} />
          <Metric label="Financial evidence up to" value={score.financialDataAsOf ? formatDate(score.financialDataAsOf) : '—'} />
          <Metric label="Assessment valid until" value={score.validUntil ? formatDate(score.validUntil) : '—'} />
        </MetricGroup>
        <p className="border-t border-line-subtle pt-4 text-sm text-content-muted">
          Financial dimensions measure the quality of your financial behaviour; verification dimensions measure
          confidence in the evidence. A trust tier can be capped by weak verification even when financial behaviour is
          strong. An assessment is valid for up to three months from the latest date its evidence covers.
        </p>
      </Section>

      <DimensionDrawer
        dimKey={drawerDim}
        score={drawerDim ? (score[drawerDim] as number) : 0}
        reasonCodes={score.reasonCodes}
        onClose={() => setDrawerDim(null)}
      />
    </PageLayout>
  )
}

// ── Animated semicircular gauge (sweep + count-up, reduced-motion aware) ────────

function AnimatedGauge({ score, tier }: { score: number; tier: TrustTier }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(score)
      return
    }
    let raf = 0
    const duration = 850
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic, no overshoot
      setShown(Math.round(score * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const r = 92
  const stroke = 12
  const w = r * 2 + stroke
  const h = r + stroke
  const cy = r + stroke / 2
  const path = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${w - stroke / 2} ${cy}`
  const arc = Math.PI * r
  const offset = arc * (1 - Math.min(1, Math.max(0, shown / 100)))

  return (
    <div className="relative" style={{ width: w, maxWidth: '100%' }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h + 8}`} aria-hidden>
        <path d={path} fill="none" stroke="#E7E0D2" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={path}
          fill="none"
          stroke={TIER_HEX[tier]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arc}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: r * 0.34 }}>
        <Display size="score">{shown}</Display>
        <span className="mt-1 text-xs text-content-muted">out of 100</span>
      </div>
    </div>
  )
}

// ── Dimension list + row ────────────────────────────────────────────────────────

function DimensionList({
  dims,
  score,
  onOpen,
}: {
  dims: DimKey[]
  score: TrustScoreData
  onOpen: (k: DimKey) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface-card">
      {dims.map((k, i) => (
        <DimensionRow key={k} dimKey={k} score={score[k] as number} first={i === 0} onOpen={() => onOpen(k)} />
      ))}
    </div>
  )
}

function DimensionRow({
  dimKey,
  score,
  first,
  onOpen,
}: {
  dimKey: DimKey
  score: number
  first: boolean
  onOpen: () => void
}) {
  const b = band(score)
  return (
    <button
      onClick={onOpen}
      className={cn(
        'flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-hover',
        !first && 'border-t border-line-subtle',
      )}
    >
      <span className="w-40 shrink-0 text-sm font-medium text-content">{DIM_LABELS[dimKey]}</span>
      <span className="hidden w-24 shrink-0 text-sm text-content-muted sm:block">{assessment(score)}</span>
      <div className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-surface-inset sm:block">
        <div className={cn('h-full rounded-full', b.bar)} style={{ width: `${Math.max(2, score)}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-content">{score}</span>
      <span className="hidden md:inline-block">
        <StatusPill status={b.tone} label={b.label} />
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-content-muted/50" />
    </button>
  )
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone: StatusTone }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-inset px-4 py-2.5">
      <span className="text-sm text-content-secondary">{label}</span>
      <StatusPill status={tone} label={value} />
    </div>
  )
}

// ── Findings ────────────────────────────────────────────────────────────────────

function FindingsColumn({
  title,
  tone,
  items,
}: {
  title: string
  tone: 'good' | 'warn'
  items: Array<{ code: string; dimension: string; sentiment: string; message: string }>
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-content-muted">
          {tone === 'good' ? 'Add financial evidence to build positive signals.' : 'Nothing is materially limiting your profile.'}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.code} className="flex items-start gap-3">
              {tone === 'good' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" />
              )}
              <div>
                <p className="text-sm text-content">{r.message}</p>
                <p className="mt-0.5 text-xs text-content-muted">{DIM_CAMEL[r.dimension] ?? r.dimension}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Dimension drawer ────────────────────────────────────────────────────────────

function DimensionDrawer({
  dimKey,
  score,
  reasonCodes,
  onClose,
}: {
  dimKey: DimKey | null
  score: number
  reasonCodes: TrustScoreData['reasonCodes']
  onClose: () => void
}) {
  const meta = dimKey ? DIM_META[dimKey] : null
  const camel = dimKey?.replace('Score', '')
  const affecting = dimKey ? reasonCodes.filter((r) => r.dimension === camel) : []
  const b = band(score)
  return (
    <Drawer
      open={!!dimKey}
      onOpenChange={(o) => !o && onClose()}
      title={dimKey ? DIM_LABELS[dimKey] : ''}
      subtitle={dimKey ? `${assessment(score)} · ${score}/100` : undefined}
    >
      {meta && (
        <div className="space-y-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-inset">
            <div className={cn('h-full rounded-full', b.bar)} style={{ width: `${Math.max(2, score)}%` }} />
          </div>

          <DrawerBlock title="What we assessed">
            <ul className="space-y-1.5">
              {meta.assessed.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm text-content-secondary">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-content-muted/50" />
                  {a}
                </li>
              ))}
            </ul>
          </DrawerBlock>

          {affecting.length > 0 && (
            <DrawerBlock title="What affected your result">
              <div className="space-y-2">
                {affecting.map((r) => (
                  <div
                    key={r.code}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      r.sentiment === 'positive' ? 'bg-success-soft text-success-strong' : 'bg-warning-soft text-warning-strong',
                    )}
                  >
                    {r.message}
                  </div>
                ))}
              </div>
            </DrawerBlock>
          )}

          <DrawerBlock title="How to improve confidence">
            <ul className="space-y-1.5">
              {meta.improve.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm text-content-secondary">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-900" />
                  {a}
                </li>
              ))}
            </ul>
          </DrawerBlock>
        </div>
      )}
    </Drawer>
  )
}

function DrawerBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">{title}</h3>
      {children}
    </div>
  )
}
