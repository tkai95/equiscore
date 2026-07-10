'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  RefreshCw,
  AlertTriangle,
  Clock,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { api, type ScoreImprovements } from '@/lib/api'
import { Drawer } from '@/components/ui/drawer'
import { formatDate, cn } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'

type ScoreDisplayStatus =
  | 'current'
  | 'expiring_soon'
  | 'expired'
  | 'evidence_withdrawn'
  | 'insufficient_evidence'

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
    improve: ['Ensure rent is paid from the connected account', 'Explain any flagged rent-like transfers on Analytics'],
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

function statusFor(score: number): { label: string; className: string; bar: string } {
  if (score >= 70) return { label: 'Strong', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' }
  if (score >= 50) return { label: 'Review', className: 'bg-gray-100 text-gray-600 ring-gray-200', bar: 'bg-sage' }
  if (score >= 1) return { label: 'Improve', className: 'bg-amber-50 text-amber-700 ring-amber-200', bar: 'bg-amber-500' }
  return { label: 'Action required', className: 'bg-amber-50 text-amber-800 ring-amber-200', bar: 'bg-amber-500' }
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
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-8 w-56 animate-pulse rounded bg-gray-200" />
        <div className="h-56 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  if (!score) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold text-gray-900">My Trust Profile</h1>
        <div className="mt-6 rounded-xl border border-[#D8D6C9] bg-white p-8 text-center">
          <p className="font-semibold text-gray-900">No assessment yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
            Your Trust Profile is built from real financial evidence. Connect a bank or upload a
            statement, then generate your assessment.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard/connections"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-cream-surface hover:bg-brand-dark"
            >
              Add your bank data
            </Link>
            <button
              onClick={() => recompute.mutate()}
              disabled={recompute.isPending}
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {recompute.isPending ? 'Generating…' : 'Generate assessment'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const capped = score.reasonCodes.some((r) => r.code === 'FOUNDATION_CAP')
  const financialAvg = Math.round(
    FINANCIAL_DIMS.reduce((s, k) => s + (score[k] as number), 0) / FINANCIAL_DIMS.length
  )
  const verificationWeak = score.identityConfidenceScore < 50 || score.verificationStrengthScore < 50
  const decision = verificationWeak
    ? 'Financially strong. Verification incomplete.'
    : financialAvg >= 70
      ? 'Financially strong and verified.'
      : 'Assessment complete.'
  const financialRating = assessment(financialAvg)

  // Primary action = the highest-impact verification/identity fix, else top improvement.
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
    <div className="mx-auto max-w-6xl space-y-6 pb-4">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight text-gray-900">My Trust Profile</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500">
            <span>Last assessed {formatDate(score.computedAt)}</span>
            {score.validUntil && (
              <span className="border-l border-gray-200 pl-4">Valid until {formatDate(score.validUntil)}</span>
            )}
            {profileMeta && (
              <span className="border-l border-gray-200 pl-4">
                {profileMeta.period.months}-month coverage
              </span>
            )}
            {profileMeta && (
              <span className="border-l border-gray-200 pl-4">
                Source: {SOURCE_LABEL[profileMeta.source] ?? profileMeta.source}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/share"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Share profile
          </Link>
          <button
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream-surface hover:bg-brand-dark disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', recompute.isPending && 'animate-spin')} />
            {recompute.isPending ? 'Recalculating…' : 'Recalculate'}
          </button>
        </div>
      </div>

      {/* Freshness notice */}
      {score.status && score.status !== 'current' && (
        <div className="flex items-start gap-3 rounded-xl bg-gray-100 px-5 py-3.5 ring-1 ring-gray-300">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
          <p className="text-sm text-gray-700">
            This assessment is based on financial evidence that is no longer current. Refresh your
            bank data or upload a newer statement to bring it up to date.
          </p>
        </div>
      )}

      {/* ── Level 1: Assessment summary ─────────────────────────────────── */}
      <div className="grid gap-6 rounded-xl border border-gray-200 bg-white p-6 lg:grid-cols-[300px_1fr] lg:p-8">
        {/* Left: gauge */}
        <div className="flex flex-col items-center justify-center border-b border-gray-100 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
          <Gauge score={score.overallScore} tier={score.overallTier} />
          <p className="mt-1 text-lg font-semibold text-gray-900">Trust Tier {score.overallTier}</p>
        </div>

        {/* Right: decision */}
        <div className="flex flex-col justify-center">
          <h2 className="text-2xl font-semibold text-gray-900">{decision}</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-600">
            {verificationWeak
              ? `Your affordability, financial stability and rental history are strong. Your profile is currently limited to Tier ${score.overallTier} because your identity and evidence could not be fully verified.`
              : 'Your financial behaviour and verified evidence support this assessment.'}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatusRow label="Financial assessment" value={financialRating} tone={financialAvg >= 55 ? 'good' : 'warn'} />
            <StatusRow
              label="Identity verification"
              value={verificationWeak ? 'Action required' : 'Verified'}
              tone={verificationWeak ? 'warn' : 'good'}
            />
          </div>

          {primary && (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href={primary.href}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-cream-surface hover:bg-brand-dark"
              >
                {verificationWeak ? 'Resolve verification' : primary.title}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard/analytics" className="text-sm font-medium text-brand hover:underline">
                View how scoring works
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Action banner ───────────────────────────────────────────────── */}
      {verificationWeak && (
        <div className="flex flex-col gap-3 rounded-xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">Complete verification to unlock a higher tier</p>
              <p className="mt-0.5 text-sm text-amber-800">
                {score.identityConfidenceScore < 50
                  ? 'The name connected to your bank account does not fully match your EquiScore profile. Resolving this raises your verification confidence.'
                  : 'Your evidence is statement-only. Connecting Open Banking or adding a document strengthens verification.'}
              </p>
            </div>
          </div>
          {primary && (
            <Link
              href={primary.href}
              className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Review details
            </Link>
          )}
        </div>
      )}

      {/* ── Level 2: Financial assessment ───────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Financial assessment</h2>
          <span className="text-sm text-gray-500">Quality of financial behaviour</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {FINANCIAL_DIMS.map((k, i) => (
            <DimensionRow
              key={k}
              dimKey={k}
              score={score[k] as number}
              first={i === 0}
              onOpen={() => setDrawerDim(k)}
            />
          ))}
        </div>
      </section>

      {/* ── Verification & confidence ───────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Verification &amp; confidence</h2>
          <span className="text-sm text-gray-500">Confidence in the evidence</span>
        </div>
        {capped && (
          <p className="mb-3 flex items-start gap-2 rounded-lg bg-brand/5 px-4 py-2.5 text-sm text-gray-700 ring-1 ring-brand/10">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            Your financial assessment ({financialRating.toLowerCase()}) supports a stronger profile. Your
            trust tier is capped at C until verification is completed.
          </p>
        )}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {VERIFICATION_DIMS.map((k, i) => (
            <DimensionRow
              key={k}
              dimKey={k}
              score={score[k] as number}
              first={i === 0}
              onOpen={() => setDrawerDim(k)}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
          <span className="text-gray-600">Profile completeness</span>
          <span className="font-semibold tabular-nums text-gray-900">{score.profileCompletenessScore}%</span>
        </div>
      </section>

      {/* ── Level 3: Key assessment findings ────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Key assessment findings</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <FindingsColumn title="Strengths" tone="good" items={strengths} />
          <FindingsColumn title="Factors limiting your profile" tone="warn" items={limiting} />
        </div>
      </section>

      {/* ── Evidence & methodology ──────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Evidence &amp; methodology</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Data coverage" value={profileMeta ? `${profileMeta.period.months} months` : '—'} />
          <Meta label="Primary source" value={profileMeta ? SOURCE_LABEL[profileMeta.source] ?? profileMeta.source : '—'} />
          <Meta label="Financial evidence up to" value={score.financialDataAsOf ? formatDate(score.financialDataAsOf) : '—'} />
          <Meta label="Assessment valid until" value={score.validUntil ? formatDate(score.validUntil) : '—'} />
        </dl>
        <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-500">
          Financial dimensions measure the quality of your financial behaviour; verification
          dimensions measure confidence in the evidence. A trust tier can be capped by weak
          verification even when financial behaviour is strong. An assessment is valid for up to three
          months from the latest date its evidence covers.
        </p>
      </section>

      {/* Dimension drawer */}
      <DimensionDrawer
        dimKey={drawerDim}
        score={drawerDim ? (score[drawerDim] as number) : 0}
        reasonCodes={score.reasonCodes}
        onClose={() => setDrawerDim(null)}
      />
    </div>
  )
}

// ── Semicircular gauge ────────────────────────────────────────────────────────

function Gauge({ score, tier }: { score: number; tier: TrustTier }) {
  const r = 92
  const stroke = 12
  const w = r * 2 + stroke
  const h = r + stroke
  const cx = w / 2
  const cy = r + stroke / 2
  const path = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${w - stroke / 2} ${cy}`
  const arc = Math.PI * r
  const offset = arc * (1 - Math.min(1, Math.max(0, score / 100)))
  return (
    <div className="relative" style={{ width: w, maxWidth: '100%' }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h + 8}`}>
        <path d={path} fill="none" stroke="#E8E6DC" strokeWidth={stroke} strokeLinecap="round" />
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
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: r * 0.38 }}>
        <span className="text-5xl font-bold leading-none tabular-nums text-gray-900">{score}</span>
        <span className="mt-1 text-xs text-gray-400">out of 100</span>
      </div>
    </div>
  )
}

// ── Dimension row ─────────────────────────────────────────────────────────────

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
  const st = statusFor(score)
  return (
    <button
      onClick={onOpen}
      className={cn(
        'flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-gray-50',
        !first && 'border-t border-gray-100'
      )}
    >
      <span className="w-40 shrink-0 text-sm font-medium text-gray-800">{DIM_LABELS[dimKey]}</span>
      <span className="hidden w-24 shrink-0 text-sm text-gray-500 sm:block">{assessment(score)}</span>
      <div className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 sm:block">
        <div className={cn('h-full rounded-full', st.bar)} style={{ width: `${Math.max(2, score)}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">{score}</span>
      <span className={cn('hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 md:inline-block', st.className)}>
        {st.label}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
    </button>
  )
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: 'good' | 'warn' }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
          tone === 'good'
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : 'bg-amber-50 text-amber-700 ring-amber-200'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-800">{value}</dd>
    </div>
  )
}

// ── Findings ──────────────────────────────────────────────────────────────────

function FindingsColumn({
  title,
  tone,
  items,
}: {
  title: string
  tone: 'good' | 'warn'
  items: Array<{ code: string; dimension: string; sentiment: string; message: string }>
}) {
  const dimLabel = (d: string) =>
    ({
      profileCompleteness: 'Profile completeness',
      verificationStrength: 'Verification strength',
      identityConfidence: 'Identity confidence',
      incomeStability: 'Income stability',
      affordability: 'Affordability',
      rentalReliability: 'Rental reliability',
      financialStability: 'Financial stability',
    })[d] ?? d
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">
          {tone === 'good' ? 'Add financial evidence to build positive signals.' : 'Nothing is materially limiting your profile.'}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.code} className="flex items-start gap-3">
              {tone === 'good' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              )}
              <div>
                <p className="text-sm text-gray-800">{r.message}</p>
                <p className="mt-0.5 text-xs text-gray-400">{dimLabel(r.dimension)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Dimension drawer ──────────────────────────────────────────────────────────

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
  const st = statusFor(score)
  return (
    <Drawer
      open={!!dimKey}
      onOpenChange={(o) => !o && onClose()}
      title={dimKey ? DIM_LABELS[dimKey] : ''}
      subtitle={dimKey ? `${assessment(score)} · ${score}/100` : undefined}
    >
      {meta && (
        <div className="space-y-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className={cn('h-full rounded-full', st.bar)} style={{ width: `${Math.max(2, score)}%` }} />
          </div>

          <Section title="What we assessed">
            <ul className="space-y-1.5">
              {meta.assessed.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
                  {a}
                </li>
              ))}
            </ul>
          </Section>

          {affecting.length > 0 && (
            <Section title="What affected your result">
              <div className="space-y-2">
                {affecting.map((r) => (
                  <div
                    key={r.code}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      r.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
                    )}
                  >
                    {r.message}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="How to improve confidence">
            <ul className="space-y-1.5">
              {meta.improve.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm text-gray-600">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  {a}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </Drawer>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
      {children}
    </div>
  )
}
