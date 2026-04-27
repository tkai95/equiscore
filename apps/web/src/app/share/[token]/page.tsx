import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { formatDate, TIER_COLORS } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { TIER_LABELS } from '@equiscore/shared'
import { ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

interface PublicProfile {
  applicantName: string | null
  trustTier: TrustTier
  overallScore: number
  verificationStrength: number
  incomeConfidence: number
  affordabilityScore: number
  rentalReliability: number
  identityConfidence: number
  fraudRisk: string
  reasonCodes: Array<{
    code: string
    dimension: string
    sentiment: 'positive' | 'negative' | 'neutral'
    message: string
    weight: number
  }>
  computedAt: string
  expiresAt: string
}

const SCORE_DIMENSIONS = [
  { key: 'verificationStrength', label: 'Verification Strength' },
  { key: 'identityConfidence', label: 'Identity Confidence' },
  { key: 'incomeConfidence', label: 'Income Confidence' },
  { key: 'affordabilityScore', label: 'Affordability' },
  { key: 'rentalReliability', label: 'Rental Reliability' },
] as const

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value)
  const color =
    pct >= 70 ? 'bg-brand' : pct >= 50 ? 'bg-sage' : pct >= 30 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{pct}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function PublicProfilePage({ params }: { params: { token: string } }) {
  let profile: PublicProfile

  try {
    profile = (await api.sharing.getPublic(params.token)) as PublicProfile
  } catch {
    notFound()
  }

  const tierColorClass = TIER_COLORS[profile.trustTier]
  const positiveReasons = profile.reasonCodes.filter((r) => r.sentiment === 'positive').slice(0, 5)
  const negativeReasons = profile.reasonCodes.filter((r) => r.sentiment === 'negative').slice(0, 3)

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-[#D8D6C9] bg-cream-surface px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand" />
            <span className="text-lg font-bold text-gray-900">Equiscore</span>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            Verified profile
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        {/* Hero */}
        <div className={`rounded-2xl border-2 p-8 ${tierColorClass}`}>
          <p className="mb-1 text-sm font-medium text-gray-500">Trust profile for</p>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            {profile.applicantName ?? 'Applicant'}
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-current bg-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{profile.trustTier}</div>
                <div className="text-xs font-medium">{Math.round(profile.overallScore)}</div>
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{TIER_LABELS[profile.trustTier]}</p>
              <p className="mt-1 max-w-md text-sm text-gray-600">
                This profile has been assessed across identity, income, and financial behaviour signals.
              </p>
            </div>
          </div>

          {profile.fraudRisk !== 'pass' && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Some signals require additional manual review.
            </div>
          )}
        </div>

        {/* Score breakdown */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand" />
            <h2 className="font-semibold text-gray-900">Score breakdown</h2>
          </div>
          <p className="mb-6 text-sm text-gray-500">Each dimension is scored 0–100.</p>
          <div className="space-y-4">
            {SCORE_DIMENSIONS.map(({ key, label }) => (
              <ScoreBar key={key} label={label} value={profile[key] as number} />
            ))}
          </div>
        </div>

        {/* Reason codes */}
        {(positiveReasons.length > 0 || negativeReasons.length > 0) && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="mb-1 flex items-center gap-2">
              <Info className="h-4 w-4 text-brand" />
              <h2 className="font-semibold text-gray-900">Key signals</h2>
            </div>
            <p className="mb-5 text-sm text-gray-500">What shaped this applicant's score.</p>
            <div className="space-y-2">
              {positiveReasons.map((r) => (
                <div key={r.code} className="flex items-start gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-sm text-gray-700">{r.message}</span>
                </div>
              ))}
              {negativeReasons.map((r) => (
                <div key={r.code} className="flex items-start gap-2.5 rounded-xl bg-red-50 px-3.5 py-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span className="text-sm text-gray-700">{r.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="text-gray-500">
              Score computed: <span className="font-medium text-gray-900">{formatDate(profile.computedAt)}</span>
            </div>
            <div className="text-gray-500">
              Link expires: <span className="font-medium text-gray-900">{formatDate(profile.expiresAt)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          This report was generated by Equiscore and is provided for reference only.
          Scores are based on self-declared and open banking data at the time of assessment.
        </p>
      </main>
    </div>
  )
}
