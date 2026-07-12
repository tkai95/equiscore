'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  RefreshCw,
  AlertTriangle,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  Wallet,
  TrendingUp,
  PiggyBank,
  Home,
  UserCheck,
  FileCheck,
  type LucideIcon,
} from 'lucide-react'
import { api, type ScoreImprovements } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { Button, buttonClasses, Card, Display, Drawer, PageLayout, PageTitle } from '@/components/ui'

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

const GAUGE_ACTIVE = '#0A473D'
const GAUGE_TRACK = '#E1E6E2'

type DimKey =
  | 'affordabilityScore'
  | 'incomeStabilityScore'
  | 'financialStabilityScore'
  | 'rentalReliabilityScore'
  | 'identityConfidenceScore'
  | 'verificationStrengthScore'
  | 'profileCompletenessScore'

const DIM: Record<DimKey, { label: string; desc: string; icon: LucideIcon }> = {
  affordabilityScore: { label: 'Affordability', desc: 'Capacity to cover rent and living costs', icon: Wallet },
  incomeStabilityScore: { label: 'Income stability', desc: 'Regularity and predictability of income', icon: TrendingUp },
  financialStabilityScore: { label: 'Financial stability', desc: 'Balances, savings buffer and overdraft use', icon: PiggyBank },
  rentalReliabilityScore: { label: 'Rental reliability', desc: 'Consistency of rent and bill payments', icon: Home },
  identityConfidenceScore: { label: 'Identity confidence', desc: 'Name and address matched to your evidence', icon: UserCheck },
  verificationStrengthScore: { label: 'Verification strength', desc: 'Strength and type of evidence provided', icon: FileCheck },
  profileCompletenessScore: { label: 'Profile completeness', desc: 'Profile fields completed', icon: CheckCircle2 },
}

const FINANCIAL_DIMS: DimKey[] = ['affordabilityScore', 'incomeStabilityScore', 'financialStabilityScore', 'rentalReliabilityScore']
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
  statement_upload: 'Uploaded statements',
  test: 'Sample data',
}

/** One rating scale everywhere: Excellent · Strong · Moderate · Review · Weak. */
function rating(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Strong'
  if (score >= 50) return 'Moderate'
  if (score >= 30) return 'Review'
  return 'Weak'
}
/** Two-tone semantics: green = strong/verified, amber = moderate/partial. */
function isStrong(score: number): boolean {
  return score >= 70
}
function ratingClass(score: number): string {
  return isStrong(score) ? 'text-success-strong' : 'text-warning-strong'
}
function barClass(score: number): string {
  return isStrong(score) ? 'bg-brand-600' : 'bg-warning-bar'
}
function dotClass(score: number): string {
  return isStrong(score) ? 'bg-success-strong' : 'bg-warning-bar'
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
  const [findingsOpen, setFindingsOpen] = useState(false)

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
      <PageLayout className="max-w-[1200px]">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-hover" />
        <div className="h-52 animate-pulse rounded-card bg-surface-hover" />
        <div className="h-64 animate-pulse rounded-card bg-surface-hover" />
      </PageLayout>
    )
  }

  if (!score) {
    return (
      <PageLayout className="max-w-[1200px]">
        <PageTitle>Trust assessment</PageTitle>
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

  const financialAvg = Math.round(FINANCIAL_DIMS.reduce((s, k) => s + (score[k] as number), 0) / FINANCIAL_DIMS.length)
  const capped = score.reasonCodes.some((r) => r.code === 'FOUNDATION_CAP')
  const verificationWeak = score.identityConfidenceScore < 50 || score.verificationStrengthScore < 50
  const nameMismatch = score.reasonCodes.some((r) => r.code === 'NAME_MISMATCH')
  const identityVerified = score.identityConfidenceScore >= 70
  const evidenceStrong = score.verificationStrengthScore >= 70
  const financiallyStrong = financialAvg >= 60
  const sourceText = SOURCE_LABEL[profileMeta?.source ?? ''] ?? 'your evidence'

  const decision = verificationWeak
    ? financiallyStrong
      ? 'Financially strong. Verification incomplete.'
      : 'Verification incomplete.'
    : financiallyStrong
      ? 'Financially strong and verified.'
      : 'Assessment complete.'

  const strengths = score.reasonCodes.filter((r) => r.sentiment === 'positive').sort((a, b) => b.weight - a.weight)
  const limiting = score.reasonCodes
    .filter((r) => r.sentiment !== 'positive')
    .sort((a, b) => (a.sentiment !== b.sentiment ? (a.sentiment === 'negative' ? -1 : 1) : b.weight - a.weight))

  const opportunities =
    improvements?.improvements && improvements.improvements.length > 0
      ? improvements.improvements.slice(0, 4).map((i) => ({ title: i.title, detail: i.detail, href: i.href }))
      : GENERIC_OPPORTUNITIES

  return (
    <PageLayout className="max-w-[1200px] pb-4">
      {/* ── Report header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle>Trust assessment</PageTitle>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-content-secondary">
            <span className="font-medium text-content">Tier {score.overallTier}</span>
            <Dot />
            <span>Score {score.overallScore}</span>
            <Dot />
            <span className="inline-flex items-center gap-1">
              {identityVerified ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success-strong" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-warning-strong" />
              )}
              {identityVerified ? 'Verified profile' : 'Verification pending'}
            </span>
          </p>
          <p className="mt-1 text-xs text-content-muted">
            Assessed {formatDate(score.computedAt)}
            {score.validUntil && ` · Valid until ${formatDate(score.validUntil)}`}
            {profileMeta && ` · ${profileMeta.period.months} months reviewed`}
            {profileMeta && ` · Source: ${SOURCE_LABEL[profileMeta.source] ?? profileMeta.source}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" loading={recompute.isPending} onClick={() => recompute.mutate()}>
            {!recompute.isPending && <RefreshCw className="h-4 w-4" />}
            {recompute.isPending ? 'Recalculating…' : 'Recalculate'}
          </Button>
          <Link href="/dashboard/share" className={buttonClasses('primary')}>
            Share assessment
          </Link>
        </div>
      </div>

      {/* Freshness notice */}
      {score.status && score.status !== 'current' && (
        <div className="flex items-start gap-3 rounded-panel bg-warning-soft px-5 py-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning-strong" />
          <p className="text-sm text-warning-strong">
            This assessment is based on financial evidence that is no longer current. Refresh your bank data or upload a
            newer statement to bring it up to date.
          </p>
        </div>
      )}

      {/* ── Assessment summary hero ────────────────────────────────────────── */}
      <Card padding="md">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <div className="flex flex-col items-center justify-center border-b border-line-subtle pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <AnimatedGauge score={score.overallScore} />
            <p className="mt-3 text-lg font-semibold text-content">Trust Tier {score.overallTier}</p>
            <p className="mt-0.5 text-sm text-content-secondary">{rating(financialAvg)} financial profile</p>
          </div>

          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-semibold tracking-tight text-content">{decision}</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-content-secondary">
              {financiallyStrong
                ? 'Your income, affordability and payment behaviour support a strong assessment. '
                : 'Your financial behaviour and evidence support this assessment. '}
              {evidenceStrong
                ? `Evidence is verified via ${sourceText}.`
                : `Evidence quality is ${rating(score.verificationStrengthScore).toLowerCase()} because this assessment currently relies on ${sourceText}.`}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <HeroStat label="Financial profile" value={rating(financialAvg)} score={financialAvg} icon={Wallet} />
              <HeroStat
                label="Identity"
                value={identityVerified ? 'Verified' : score.identityConfidenceScore >= 50 ? 'Partial' : 'Unverified'}
                score={score.identityConfidenceScore}
                icon={ShieldCheck}
              />
              <HeroStat label="Evidence quality" value={rating(score.verificationStrengthScore)} score={score.verificationStrengthScore} icon={FileCheck} />
            </div>
          </div>
        </div>
      </Card>

      {/* Action banner */}
      {verificationWeak && (
        <div className="flex flex-col gap-3 rounded-panel bg-warning-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-strong" />
            <div>
              <p className="font-semibold text-warning-strong">Complete verification to unlock a higher tier</p>
              <p className="mt-0.5 text-sm text-warning-strong">
                {nameMismatch
                  ? 'The name connected to your bank account does not fully match your EquiScore profile. Resolving this raises your verification confidence.'
                  : score.identityConfidenceScore < 50
                    ? 'Add a government photo ID so we can verify your identity — the biggest lever on your tier. A verified ID confirms your name and date of birth.'
                    : 'Your evidence is statement-only. Connecting Open Banking or adding a document strengthens verification.'}
              </p>
            </div>
          </div>
          {improvements?.improvements[0] && (
            <Link href={improvements.improvements[0].href} className={buttonClasses('primary', 'sm', 'shrink-0')}>
              Review details
            </Link>
          )}
        </div>
      )}

      {/* ── Financial assessment + Evidence quality (two-column) ───────────── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)]">
        <Panel title="Financial assessment" subtitle="Snapshot of your financial behaviour">
          <MetricList dims={FINANCIAL_DIMS} score={score} onOpen={setDrawerDim} />
        </Panel>
        <Panel title="Evidence quality" subtitle="Confidence in the evidence supporting your profile">
          {capped && (
            <div className="flex items-start gap-2 border-b border-line-subtle bg-surface-inset px-5 py-3 text-sm text-content-secondary">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-900" />
              Your financial assessment ({rating(financialAvg).toLowerCase()}) supports a stronger profile. Your trust
              tier is capped at C until verification is completed.
            </div>
          )}
          <MetricList dims={VERIFICATION_DIMS} score={score} onOpen={setDrawerDim} />
        </Panel>
      </div>

      {/* ── Key findings ───────────────────────────────────────────────────── */}
      <Panel
        title="Key findings"
        action={
          <button onClick={() => setFindingsOpen(true)} className="text-sm font-medium text-brand-900 hover:underline">
            View all findings
          </button>
        }
      >
        <div className="grid sm:grid-cols-2">
          <div className="px-5 py-5 sm:border-r sm:border-line-subtle">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-muted">What strengthens your profile</h3>
            {strengths.length === 0 ? (
              <p className="text-sm text-content-secondary">Add financial evidence to build positive signals.</p>
            ) : (
              <ul className="space-y-3.5">
                {strengths.slice(0, 5).map((r) => (
                  <li key={r.code} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" />
                    <div>
                      <p className="text-sm text-content">{r.message}</p>
                      <p className="mt-0.5 text-xs text-content-muted">Supports {DIM_CAMEL[r.dimension] ?? r.dimension}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="px-5 py-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-muted">What could strengthen confidence further</h3>
            <ul className="space-y-3.5">
              {opportunities.map((o) => {
                const body = (
                  <>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    <div>
                      <p className="text-sm text-content">{o.title}</p>
                      <p className="mt-0.5 text-xs text-content-muted">{o.detail}</p>
                    </div>
                  </>
                )
                return o.href ? (
                  <li key={o.title}>
                    <Link href={o.href} className="flex items-start gap-3 hover:opacity-80">
                      {body}
                    </Link>
                  </li>
                ) : (
                  <li key={o.title} className="flex items-start gap-3">
                    {body}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </Panel>

      {/* ── How this assessment works ──────────────────────────────────────── */}
      <Panel
        title="How this assessment works"
        subtitle="See the evidence sources, verification checks and scoring approach used in this assessment."
      >
        <div className="px-5">
          <Accordion title="Evidence reviewed" subtitle="Sources and data used in this assessment">
            <ul className="space-y-1.5">
              <Fact label="Primary source" value={profileMeta ? SOURCE_LABEL[profileMeta.source] ?? profileMeta.source : '—'} />
              <Fact label="Coverage" value={profileMeta ? `${profileMeta.period.months} months of transaction history` : '—'} />
              <Fact label="Financial evidence up to" value={score.financialDataAsOf ? formatDate(score.financialDataAsOf) : '—'} />
              <Fact label="Transactions reviewed" value={profileMeta ? String(profileMeta.period.transactionCount) : '—'} />
            </ul>
          </Accordion>
          <Accordion title="Verification checks" subtitle="Identity, account and data validation performed">
            <ul className="space-y-1.5">
              <Check ok={identityVerified} label="Name matched to the connected account holder" />
              <Check ok={!nameMismatch} label="No name mismatch detected" />
              <Check ok={evidenceStrong} label="Evidence verified via Open Banking" />
              <Check ok={score.profileCompletenessScore >= 80} label={`Profile ${score.profileCompletenessScore}% complete`} />
            </ul>
          </Accordion>
          <Accordion title="Scoring methodology" subtitle="How scores are calculated and weighted">
            <p>
              Financial dimensions measure the quality of your financial behaviour; verification dimensions measure
              confidence in the evidence. A trust tier can be capped by weak verification even when financial behaviour
              is strong — so a strong result on statement-only evidence is presented honestly, with evidence quality
              shown separately.
            </p>
          </Accordion>
          <Accordion title="Data freshness & limitations" subtitle="Recency of data and important considerations">
            <ul className="space-y-1.5">
              <Fact label="Assessed" value={formatDate(score.computedAt)} />
              <Fact label="Valid until" value={score.validUntil ? formatDate(score.validUntil) : '—'} />
              <li className="text-sm text-content-secondary">
                An assessment is valid for up to three months from the latest date its evidence covers.
                {!evidenceStrong && ' Connecting Open Banking would raise evidence quality from statement-only.'}
              </li>
            </ul>
          </Accordion>
        </div>
      </Panel>

      <DimensionDrawer
        dimKey={drawerDim}
        score={drawerDim ? (score[drawerDim] as number) : 0}
        reasonCodes={score.reasonCodes}
        onClose={() => setDrawerDim(null)}
      />
      <FindingsDrawer open={findingsOpen} onClose={() => setFindingsOpen(false)} strengths={strengths} limiting={limiting} />
    </PageLayout>
  )
}

const GENERIC_OPPORTUNITIES = [
  { title: 'Add longer historical coverage where available', detail: 'More months of evidence sharpen the assessment.', href: '/dashboard/connections' },
  { title: 'Verify additional recurring income or accounts', detail: 'Extra verified sources raise confidence.', href: '/dashboard/connections' },
  { title: 'Keep your profile information up to date', detail: 'Accurate details prevent mismatches when sharing.', href: '/dashboard/profile' },
] as Array<{ title: string; detail: string; href?: string }>

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-content-muted/60" aria-hidden />
}

// ── Animated semicircular gauge (sweep + count-up, reduced-motion aware) ────────

function AnimatedGauge({ score }: { score: number }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(score)
      return
    }
    let raf = 0
    const duration = 850
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(score * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const r = 74
  const stroke = 9
  const w = r * 2 + stroke
  const cy = r + stroke / 2
  const path = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${w - stroke / 2} ${cy}`
  const arc = Math.PI * r
  const offset = arc * (1 - Math.min(1, Math.max(0, shown / 100)))

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: w, maxWidth: '100%' }}>
        <svg width="100%" viewBox={`0 0 ${w} ${cy + 1}`} aria-hidden>
          <path d={path} fill="none" stroke={GAUGE_TRACK} strokeWidth={stroke} strokeLinecap="round" />
          <path
            d={path}
            fill="none"
            stroke={GAUGE_ACTIVE}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={arc}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <Display size="score">{shown}</Display>
        </div>
      </div>
    </div>
  )
}

// ── Hero status tile ────────────────────────────────────────────────────────────

function HeroStat({ label, value, score, icon: Icon }: { label: string; value: string; score: number; icon: LucideIcon }) {
  const strong = isStrong(score)
  return (
    <div className="flex items-center gap-3 rounded-panel border border-line bg-surface-secondary px-3.5 py-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          strong ? 'bg-success-soft text-success-strong' : 'bg-warning-tile text-warning-strong',
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-content-muted">{label}</p>
        <p className={cn('text-sm font-semibold', ratingClass(score))}>{value}</p>
      </div>
    </div>
  )
}

// ── Report section + metric rows (icon badge + descriptor) ──────────────────────

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card padding="none">
      <div className="flex items-start justify-between gap-4 border-b border-line-subtle px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-content">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-content-secondary">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  )
}

function MetricList({ dims, score, onOpen }: { dims: DimKey[]; score: TrustScoreData; onOpen: (k: DimKey) => void }) {
  return (
    <div>
      {dims.map((k, i) => (
        <MetricRow key={k} dimKey={k} score={score[k] as number} first={i === 0} onOpen={() => onOpen(k)} />
      ))}
    </div>
  )
}

function MetricRow({ dimKey, score, first, onOpen }: { dimKey: DimKey; score: number; first: boolean; onOpen: () => void }) {
  const { label, desc, icon: Icon } = DIM[dimKey]
  return (
    <button
      onClick={onOpen}
      className={cn(
        'flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-surface-hover',
        !first && 'border-t border-line-subtle',
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-900">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-content">{label}</span>
        <span className="block truncate text-xs text-content-muted">{desc}</span>
      </span>
      <span className={cn('hidden w-20 text-right text-sm font-medium sm:block', ratingClass(score))}>{rating(score)}</span>
      <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-surface-hover sm:block lg:w-32">
        <div className={cn('h-full rounded-full', barClass(score))} style={{ width: `${Math.max(3, score)}%` }} />
      </div>
      <span className="w-8 text-right text-sm font-semibold tabular-nums text-content">{score}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-content-muted/60" />
    </button>
  )
}

// ── Accordion (methodology) ─────────────────────────────────────────────────────

function Accordion({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line-subtle last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-semibold text-content">{title}</p>
          <p className="mt-0.5 text-xs text-content-muted">{subtitle}</p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-content-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-4 text-sm leading-relaxed text-content-secondary">{children}</div>
    </details>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <span className="text-content-muted">{label}</span>
      <span className="text-right font-medium text-content">{value}</span>
    </li>
  )
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success-strong" />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning-strong" />
      )}
      <span className={ok ? 'text-content-secondary' : 'text-warning-strong'}>{label}</span>
    </li>
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
  return (
    <Drawer
      open={!!dimKey}
      onOpenChange={(o) => !o && onClose()}
      title={dimKey ? DIM[dimKey].label : ''}
      subtitle={dimKey ? `${rating(score)} · ${score}/100` : undefined}
    >
      {meta && (
        <div className="space-y-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
            <div className={cn('h-full rounded-full', barClass(score))} style={{ width: `${Math.max(3, score)}%` }} />
          </div>

          <DrawerBlock title="What we assessed">
            <ul className="space-y-1.5">
              {meta.assessed.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm text-content-secondary">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-content-muted/60" />
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

function FindingsDrawer({
  open,
  onClose,
  strengths,
  limiting,
}: {
  open: boolean
  onClose: () => void
  strengths: TrustScoreData['reasonCodes']
  limiting: TrustScoreData['reasonCodes']
}) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} title="All findings" subtitle={`${strengths.length + limiting.length} signals`}>
      <div className="space-y-5">
        <DrawerBlock title={`Strengths (${strengths.length})`}>
          <div className="space-y-2">
            {strengths.map((r) => (
              <div key={r.code} className="flex items-start gap-2 text-sm text-content-secondary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" />
                <div>
                  {r.message}
                  <span className="block text-xs text-content-muted">{DIM_CAMEL[r.dimension] ?? r.dimension}</span>
                </div>
              </div>
            ))}
          </div>
        </DrawerBlock>
        {limiting.length > 0 && (
          <DrawerBlock title={`Could strengthen (${limiting.length})`}>
            <div className="space-y-2">
              {limiting.map((r) => (
                <div key={r.code} className="flex items-start gap-2 text-sm text-content-secondary">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" />
                  <div>
                    {r.message}
                    <span className="block text-xs text-content-muted">{DIM_CAMEL[r.dimension] ?? r.dimension}</span>
                  </div>
                </div>
              ))}
            </div>
          </DrawerBlock>
        )}
      </div>
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
