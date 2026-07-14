'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  MessageSquarePlus,
  RotateCcw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import {
  workspaceApi,
  type RecordWorkspaceCaseDecisionInput,
  type WorkspaceAssessmentCaseDetail,
} from '@/lib/workspace-api'
import {
  Button,
  buttonClasses,
  Card,
  Metric,
  MetricGroup,
  PageHeader,
  PageLayout,
  Section,
  StatusPill,
  type StatusTone,
} from '@/components/ui'
import {
  Cell,
  EmptyWorkspaceState,
  WorkspaceTable,
  formatMaybeDate,
  label,
} from './workspace-table'

const STATUS_TONES: Record<string, StatusTone> = {
  meets_criteria: 'success',
  assessment_ready: 'success',
  ready_for_assessment: 'info',
  review_required: 'warning',
  information_required: 'warning',
  information_requested: 'warning',
  applicant_responded: 'info',
  under_review: 'info',
  review_complete: 'success',
  company_decision_recorded: 'success',
  approved: 'success',
  approved_with_conditions: 'success',
  additional_information_required: 'warning',
  guarantor_or_alternative_route_required: 'warning',
  referred_for_manual_review: 'info',
  open: 'warning',
  resolved: 'success',
  declined: 'danger',
  withdrawn: 'neutral',
  expired_without_decision: 'danger',
  expired: 'neutral',
  cancelled: 'danger',
  revoked: 'danger',
  pass: 'success',
  fail: 'danger',
  review: 'warning',
  missing: 'warning',
}

type DecisionValue = RecordWorkspaceCaseDecisionInput['decision']

const DECISION_OPTIONS: Array<{ value: DecisionValue; label: string }> = [
  { value: 'approved', label: 'Approved' },
  { value: 'approved_with_conditions', label: 'Approved with conditions' },
  { value: 'additional_information_required', label: 'Additional information required' },
  { value: 'guarantor_or_alternative_route_required', label: 'Alternative route required' },
  { value: 'referred_for_manual_review', label: 'Refer for manual review' },
  { value: 'declined', label: 'Declined' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'expired_without_decision', label: 'Expired without decision' },
]

const inputClass =
  'border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none'

function statusTone(value: string | null | undefined): StatusTone {
  return value ? (STATUS_TONES[value] ?? 'neutral') : 'neutral'
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not set'
  if (typeof value === 'number')
    return Number.isInteger(value) ? value.toString() : value.toFixed(2)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length === 0 ? 'None' : value.join(', ')
  return String(value)
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function daysSince(value: string | null | undefined): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null
  return Math.floor((Date.now() - timestamp) / 86_400_000)
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null
  return Math.ceil((timestamp - Date.now()) / 86_400_000)
}

function isDecisionOverride(
  decision: DecisionValue,
  outcome: WorkspaceAssessmentCaseDetail['assessmentOutcome']
): boolean {
  if (!outcome) return false
  if (decision === 'approved' || decision === 'approved_with_conditions') {
    return outcome !== 'meets_criteria'
  }
  if (decision === 'declined') return outcome === 'meets_criteria'
  if (decision === 'additional_information_required') return outcome !== 'information_required'
  if (decision === 'referred_for_manual_review') return outcome === 'meets_criteria'
  return false
}

function suggestedDecisionFor(
  outcome: WorkspaceAssessmentCaseDetail['assessmentOutcome']
): DecisionValue {
  if (outcome === 'meets_criteria') return 'approved'
  if (outcome === 'alternative_route_recommended') {
    return 'guarantor_or_alternative_route_required'
  }
  if (outcome === 'information_required' || outcome === 'unable_to_assess') {
    return 'additional_information_required'
  }
  return 'referred_for_manual_review'
}

function buildReviewReadiness(
  data: WorkspaceAssessmentCaseDetail,
  trustScore: Record<string, unknown>,
  verification: Record<string, unknown>
) {
  const openRequests = data.informationRequests.filter((request) => request.status === 'open')
  const applicantResponses = data.informationRequests.filter(
    (request) => request.status === 'applicant_responded'
  )
  const evidenceAge = daysSince(data.snapshot.dataPeriodEnd ?? data.snapshot.createdAt)
  const expiresIn = daysUntil(data.expiresAt ?? data.consent.expiresAt)
  const activeBankConnections = numberValue(verification.activeBankConnections) ?? 0
  const verifiedDocuments = numberValue(verification.verifiedDocuments) ?? 0
  const trustScoreValue = numberValue(trustScore.score)

  const flags: string[] = []
  const strengths: string[] = []

  if (openRequests.length > 0) flags.push(`${openRequests.length} open information request`)
  if (applicantResponses.length > 0)
    strengths.push(`${applicantResponses.length} applicant response ready`)
  if (data.assessmentConfidence === 'low') flags.push('Low assessment confidence')
  if (
    data.assessmentOutcome === 'information_required' ||
    data.assessmentOutcome === 'unable_to_assess'
  ) {
    flags.push('Assessment needs more evidence')
  }
  if (data.snapshot.sourceFreshness === 'profile_only') flags.push('Profile-only snapshot')
  if (evidenceAge !== null && evidenceAge > 90) flags.push('Evidence is older than 90 days')
  if (expiresIn !== null && expiresIn < 0) flags.push('Assessment has expired')
  else if (expiresIn !== null && expiresIn <= 7) {
    flags.push(
      expiresIn === 0 ? 'Assessment expires today' : `Assessment expires in ${expiresIn} days`
    )
  }
  if (!data.policy) flags.push('No active policy version attached')

  if (trustScoreValue !== null) strengths.push(`Trust score ${trustScoreValue}`)
  if (activeBankConnections > 0) strengths.push(`${activeBankConnections} active bank connection`)
  if (verifiedDocuments > 0) strengths.push(`${verifiedDocuments} verified document`)
  if (data.assessmentConfidence === 'high' || data.assessmentConfidence === 'medium') {
    strengths.push(`${label(data.assessmentConfidence)} confidence`)
  }
  if (data.policy) strengths.push(`Policy ${data.policy.policy.name} v${data.policy.versionNumber}`)

  if (data.companyDecision) {
    return {
      tone: 'success' as StatusTone,
      title: 'Decision recorded',
      body: 'This case has a company decision. Review the activity trail before changing direction.',
      nextAction: 'Check the recorded rationale and audit trail.',
      flags,
      strengths,
    }
  }

  if (applicantResponses.length > 0) {
    return {
      tone: 'info' as StatusTone,
      title: 'Applicant response ready',
      body: 'The applicant has responded to at least one information request.',
      nextAction: 'Review the response, resolve the request, then record a decision.',
      flags,
      strengths,
    }
  }

  if (openRequests.length > 0) {
    return {
      tone: 'warning' as StatusTone,
      title: 'Waiting on applicant',
      body: 'A decision can still be recorded, but there is an open information request.',
      nextAction: 'Wait for the applicant or cancel/reopen the request if it is no longer needed.',
      flags,
      strengths,
    }
  }

  if (flags.length > 0) {
    return {
      tone: 'warning' as StatusTone,
      title: 'Review quality flags',
      body: 'This case has signals that should be checked before a final decision.',
      nextAction: 'Request information or record a decision with a clear rationale.',
      flags,
      strengths,
    }
  }

  return {
    tone: 'success' as StatusTone,
    title: 'Ready to decide',
    body: 'The current snapshot has enough supporting evidence for a standard review.',
    nextAction: 'Record the company decision and rationale.',
    flags,
    strengths,
  }
}

function FieldList({ rows }: { rows: Array<{ label: string; value: unknown }> }) {
  return (
    <dl className="divide-line-subtle divide-y text-sm">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-2 py-3 sm:grid-cols-[220px_minmax(0,1fr)]">
          <dt className="text-content-muted">{row.label}</dt>
          <dd className="text-content font-medium">{displayValue(row.value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function SignalList({ title, items, tone }: { title: string; items: string[]; tone: StatusTone }) {
  return (
    <div className="bg-surface-inset rounded-lg p-4">
      <p className="text-content-muted text-xs font-semibold uppercase tracking-wide">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <StatusPill
                status={tone}
                label=""
                icon={tone === 'success' ? <CheckCircle2 /> : <AlertTriangle />}
                className="mt-0.5 h-5 w-5 shrink-0 px-0"
              />
              <span className="text-content-secondary">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-content-secondary mt-3 text-sm">None</p>
      )}
    </div>
  )
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="bg-surface-inset text-content-secondary max-h-64 overflow-auto rounded-lg p-3 text-xs leading-relaxed">
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  )
}

export function AssessmentCaseDetailView({
  organisationSlug,
  caseId,
}: {
  organisationSlug: string
  caseId: string
}) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const detailQueryKey = ['workspace-case-detail', organisationSlug, caseId] as const
  const [decisionForm, setDecisionForm] = useState({
    decision: 'approved' as DecisionValue,
    rationale: '',
    conditions: '',
    overrideReason: '',
  })
  const [infoForm, setInfoForm] = useState({
    requestType: 'general',
    message: '',
    requestedFields: '',
    dueAt: '',
  })
  const { data, isLoading, isError, error } = useQuery({
    queryKey: detailQueryKey,
    queryFn: async () =>
      workspaceApi.organisations.caseDetail((await getToken())!, organisationSlug, caseId),
  })

  const refreshCase = (updated: WorkspaceAssessmentCaseDetail) => {
    queryClient.setQueryData(detailQueryKey, updated)
    void queryClient.invalidateQueries({ queryKey: ['workspace-cases', organisationSlug] })
    void queryClient.invalidateQueries({ queryKey: ['workspace-audit', organisationSlug] })
    void queryClient.invalidateQueries({ queryKey: ['workspace-overview', organisationSlug] })
  }

  const recordDecision = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return workspaceApi.organisations.recordCaseDecision(token!, organisationSlug, caseId, {
        decision: decisionForm.decision,
        rationale: decisionForm.rationale,
        conditions: decisionForm.conditions || undefined,
        overrideReason: decisionForm.overrideReason || undefined,
      })
    },
    onSuccess: (updated) => {
      refreshCase(updated)
      setDecisionForm({
        decision: 'approved',
        rationale: '',
        conditions: '',
        overrideReason: '',
      })
    },
  })

  const requestInformation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return workspaceApi.organisations.requestCaseInformation(token!, organisationSlug, caseId, {
        requestType: infoForm.requestType || undefined,
        message: infoForm.message,
        requestedFields: infoForm.requestedFields || undefined,
        dueAt: infoForm.dueAt
          ? new Date(`${infoForm.dueAt}T23:59:59.000Z`).toISOString()
          : undefined,
      })
    },
    onSuccess: (updated) => {
      refreshCase(updated)
      setInfoForm({
        requestType: 'general',
        message: '',
        requestedFields: '',
        dueAt: '',
      })
    },
  })

  const updateInformationRequestStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: 'open' | 'resolved' | 'cancelled'
    }) => {
      const token = await getToken()
      return workspaceApi.organisations.updateInformationRequestStatus(
        token!,
        organisationSlug,
        caseId,
        id,
        { status }
      )
    },
    onSuccess: (updated) => {
      refreshCase(updated)
    },
  })

  const submitDecision = (event: FormEvent) => {
    event.preventDefault()
    if (decisionForm.rationale.trim() && !missingOverrideReason) recordDecision.mutate()
  }

  const submitInformationRequest = (event: FormEvent) => {
    event.preventDefault()
    if (infoForm.message.trim()) requestInformation.mutate()
  }

  if (isLoading) {
    return (
      <PageLayout width="wide">
        <div className="bg-surface-hover h-8 w-72 animate-pulse rounded" />
        <div className="rounded-card bg-surface-hover h-56 animate-pulse" />
      </PageLayout>
    )
  }

  if (isError || !data) {
    return (
      <PageLayout width="wide">
        <PageHeader
          title="Assessment unavailable"
          description="This case could not be loaded for the current organisation."
          actions={
            <Link
              href={`/workspace/o/${organisationSlug}/assessments`}
              className={buttonClasses('secondary', 'md')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          }
        />
        <Card padding="lg">
          <EmptyWorkspaceState
            title="Assessment case unavailable"
            body={(error as Error | undefined)?.message ?? 'Please try again.'}
          />
        </Card>
      </PageLayout>
    )
  }

  const trustScore = asRecord(data.snapshot.trustScoreSummary)
  const income = asRecord(data.snapshot.incomeSummary)
  const affordability = asRecord(data.snapshot.affordabilitySummary)
  const verification = asRecord(data.snapshot.verificationSummary)
  const readiness = buildReviewReadiness(data, trustScore, verification)
  const suggestedDecision = suggestedDecisionFor(data.assessmentOutcome)
  const selectedDecisionIsOverride = isDecisionOverride(
    decisionForm.decision,
    data.assessmentOutcome
  )
  const missingOverrideReason = selectedDecisionIsOverride && !decisionForm.overrideReason.trim()

  return (
    <PageLayout width="wide">
      <PageHeader
        title={data.applicant.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{data.applicant.email}</span>
            <StatusPill status={statusTone(data.status)} label={label(data.status)} />
            <StatusPill
              status={statusTone(data.assessmentOutcome)}
              label={label(data.assessmentOutcome)}
            />
          </span>
        }
        actions={
          <Link
            href={`/workspace/o/${organisationSlug}/assessments`}
            className={buttonClasses('secondary', 'md')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to assessments
          </Link>
        }
      />

      <Card padding="lg">
        <Section
          title={
            <span className="flex items-center gap-2">
              <ClipboardCheck className="text-brand h-4 w-4" />
              Assessment summary
            </span>
          }
        >
          <MetricGroup>
            <Metric label="Assessment type" value={label(data.assessmentType)} />
            <Metric label="Outcome" value={label(data.assessmentOutcome)} />
            <Metric label="Confidence" value={label(data.assessmentConfidence)} />
            <Metric label="Company decision" value={label(data.companyDecision)} />
            <Metric label="Assessed" value={formatMaybeDate(data.assessedAt)} />
          </MetricGroup>
        </Section>
      </Card>

      <Card padding="lg">
        <Section
          title={
            <span className="flex items-center gap-2">
              <ShieldCheck className="text-brand h-4 w-4" />
              Review readiness
            </span>
          }
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="bg-surface-inset rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                  status={readiness.tone}
                  label={readiness.title}
                  icon={
                    readiness.tone === 'success' ? (
                      <CheckCircle2 />
                    ) : readiness.tone === 'info' ? (
                      <Clock3 />
                    ) : (
                      <AlertTriangle />
                    )
                  }
                />
                <StatusPill
                  status={statusTone(data.assessmentConfidence)}
                  label={`${label(data.assessmentConfidence)} confidence`}
                />
              </div>
              <p className="text-content-secondary mt-3 text-sm">{readiness.body}</p>
              <p className="text-content mt-3 text-sm font-medium">{readiness.nextAction}</p>
            </div>

            <div className="bg-surface-inset rounded-lg p-4">
              <p className="text-content-muted text-xs font-semibold uppercase tracking-wide">
                Suggested decision
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill
                  status={statusTone(suggestedDecision)}
                  label={label(suggestedDecision)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setDecisionForm((current) => ({
                      ...current,
                      decision: suggestedDecision,
                    }))
                  }
                >
                  Use suggested
                </Button>
              </div>
              <p className="text-content-secondary mt-3 text-sm">
                Suggestions follow the EquiScore outcome, but the company decision remains yours.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SignalList title="Quality flags" items={readiness.flags} tone="warning" />
            <SignalList title="Supporting signals" items={readiness.strengths} tone="success" />
          </div>
        </Section>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card padding="lg">
          <Section
            title={
              <span className="flex items-center gap-2">
                <ClipboardCheck className="text-brand h-4 w-4" />
                Record decision
              </span>
            }
          >
            <form onSubmit={submitDecision} className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-content block text-sm font-medium" htmlFor="case-decision">
                    Decision
                  </label>
                  {selectedDecisionIsOverride && (
                    <StatusPill status="warning" label="Override" icon={<AlertTriangle />} />
                  )}
                </div>
                <select
                  id="case-decision"
                  value={decisionForm.decision}
                  onChange={(event) =>
                    setDecisionForm((current) => ({
                      ...current,
                      decision: event.target.value as DecisionValue,
                    }))
                  }
                  className={inputClass}
                >
                  {DECISION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-content block text-sm font-medium"
                  htmlFor="case-decision-rationale"
                >
                  Rationale
                </label>
                <textarea
                  id="case-decision-rationale"
                  value={decisionForm.rationale}
                  onChange={(event) =>
                    setDecisionForm((current) => ({
                      ...current,
                      rationale: event.target.value,
                    }))
                  }
                  className={`${inputClass} min-h-24 resize-y`}
                  rows={4}
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label
                    className="text-content block text-sm font-medium"
                    htmlFor="case-decision-conditions"
                  >
                    Conditions
                  </label>
                  <textarea
                    id="case-decision-conditions"
                    value={decisionForm.conditions}
                    onChange={(event) =>
                      setDecisionForm((current) => ({
                        ...current,
                        conditions: event.target.value,
                      }))
                    }
                    className={`${inputClass} min-h-20 resize-y`}
                    rows={3}
                  />
                </div>
                <div>
                  <label
                    className="text-content block text-sm font-medium"
                    htmlFor="case-decision-override"
                  >
                    Override reason
                  </label>
                  <textarea
                    id="case-decision-override"
                    value={decisionForm.overrideReason}
                    onChange={(event) =>
                      setDecisionForm((current) => ({
                        ...current,
                        overrideReason: event.target.value,
                      }))
                    }
                    className={`${inputClass} min-h-20 resize-y`}
                    rows={3}
                  />
                  {selectedDecisionIsOverride && (
                    <p className="text-content-muted mt-1 text-xs">
                      Required because this decision differs from the EquiScore outcome.
                    </p>
                  )}
                </div>
              </div>
              {recordDecision.isError && (
                <p className="text-danger-strong text-sm">
                  {(recordDecision.error as Error).message}
                </p>
              )}
              {missingOverrideReason && (
                <p className="text-warning-strong text-sm">
                  Add an override reason before saving this decision.
                </p>
              )}
              <Button
                type="submit"
                loading={recordDecision.isPending}
                disabled={!decisionForm.rationale.trim() || missingOverrideReason}
              >
                <Send className="h-4 w-4" />
                Save decision
              </Button>
            </form>
          </Section>
        </Card>

        <Card padding="lg">
          <Section
            title={
              <span className="flex items-center gap-2">
                <MessageSquarePlus className="text-brand h-4 w-4" />
                Request information
              </span>
            }
          >
            <form onSubmit={submitInformationRequest} className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label
                    className="text-content block text-sm font-medium"
                    htmlFor="case-info-type"
                  >
                    Type
                  </label>
                  <input
                    id="case-info-type"
                    value={infoForm.requestType}
                    onChange={(event) =>
                      setInfoForm((current) => ({
                        ...current,
                        requestType: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-content block text-sm font-medium" htmlFor="case-info-due">
                    Due date
                  </label>
                  <input
                    id="case-info-due"
                    type="date"
                    value={infoForm.dueAt}
                    onChange={(event) =>
                      setInfoForm((current) => ({
                        ...current,
                        dueAt: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-content block text-sm font-medium"
                  htmlFor="case-info-fields"
                >
                  Requested fields
                </label>
                <input
                  id="case-info-fields"
                  value={infoForm.requestedFields}
                  onChange={(event) =>
                    setInfoForm((current) => ({
                      ...current,
                      requestedFields: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="income, bank connection, identity document"
                />
              </div>
              <div>
                <label
                  className="text-content block text-sm font-medium"
                  htmlFor="case-info-message"
                >
                  Message
                </label>
                <textarea
                  id="case-info-message"
                  value={infoForm.message}
                  onChange={(event) =>
                    setInfoForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  className={`${inputClass} min-h-28 resize-y`}
                  rows={5}
                />
              </div>
              {requestInformation.isError && (
                <p className="text-danger-strong text-sm">
                  {(requestInformation.error as Error).message}
                </p>
              )}
              <Button
                type="submit"
                variant="secondary"
                loading={requestInformation.isPending}
                disabled={!infoForm.message.trim()}
              >
                <MessageSquarePlus className="h-4 w-4" />
                Request info
              </Button>
            </form>
          </Section>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card padding="lg">
          <Section
            title={
              <span className="flex items-center gap-2">
                <ShieldCheck className="text-brand h-4 w-4" />
                Snapshot
              </span>
            }
            description={`Snapshot v${data.snapshot.version} · ${data.snapshot.integrityHash.slice(0, 12)}`}
          >
            <FieldList
              rows={[
                { label: 'Trust score', value: trustScore.score },
                { label: 'Tier', value: trustScore.tier },
                { label: 'Fraud risk', value: trustScore.fraudRisk },
                {
                  label: 'Financial data as of',
                  value: formatMaybeDate(data.snapshot.dataPeriodEnd),
                },
                { label: 'Source freshness', value: label(data.snapshot.sourceFreshness) },
                { label: 'Created', value: formatMaybeDate(data.snapshot.createdAt) },
              ]}
            />
          </Section>
        </Card>

        <Card padding="lg">
          <Section title="Consent and request">
            <FieldList
              rows={[
                { label: 'Consent status', value: label(data.consent.status) },
                { label: 'Purpose', value: data.consent.purpose },
                { label: 'Consent granted', value: formatMaybeDate(data.consent.grantedAt) },
                { label: 'Consent expires', value: formatMaybeDate(data.consent.expiresAt) },
                { label: 'Request status', value: label(data.request?.status) },
                { label: 'Deadline', value: formatMaybeDate(data.request?.deadline) },
                { label: 'Reference', value: data.reference ?? data.consent.companyReference },
              ]}
            />
          </Section>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card padding="lg">
          <Section title="Income">
            <FieldList
              rows={[
                { label: 'Declared monthly income', value: income.declaredMonthlyIncome },
                { label: 'Employment type', value: label(displayValue(income.employmentType)) },
                { label: 'Employer provided', value: income.currentEmployerProvided },
                { label: 'Income stability score', value: income.latestIncomeStabilityScore },
              ]}
            />
          </Section>
        </Card>
        <Card padding="lg">
          <Section title="Affordability">
            <FieldList
              rows={[
                { label: 'Proposed commitment', value: affordability.proposedCommitment },
                { label: 'Declared monthly rent', value: affordability.declaredMonthlyRent },
                { label: 'Affordability score', value: affordability.latestAffordabilityScore },
                {
                  label: 'Financial stability score',
                  value: affordability.latestFinancialStabilityScore,
                },
              ]}
            />
          </Section>
        </Card>
        <Card padding="lg">
          <Section title="Verification">
            <FieldList
              rows={[
                { label: 'Active bank connections', value: verification.activeBankConnections },
                { label: 'Verified documents', value: verification.verifiedDocuments },
                { label: 'Total documents', value: verification.totalDocuments },
                { label: 'Verification strength', value: verification.verificationStrengthScore },
                { label: 'Identity confidence', value: verification.identityConfidenceScore },
              ]}
            />
          </Section>
        </Card>
      </div>

      <Card padding="lg">
        <Section
          title={
            <span className="flex items-center gap-2">
              <FileText className="text-brand h-4 w-4" />
              Policy criteria
            </span>
          }
          description={
            data.policy
              ? `${data.policy.policy.name} v${data.policy.versionNumber}`
              : 'MVP deterministic assessment criteria'
          }
        >
          {data.criterionResults.length === 0 ? (
            <EmptyWorkspaceState
              title="No criteria recorded"
              body="Criteria results will appear here when the assessment engine evaluates the snapshot."
            />
          ) : (
            <WorkspaceTable
              columns={['Criterion', 'Result', 'Confidence', 'Observed', 'Threshold']}
            >
              {data.criterionResults.map((result) => (
                <tr key={result.id}>
                  <Cell>
                    <p className="font-medium">
                      {result.policyRule?.name ?? 'MVP completion rule'}
                    </p>
                    <p className="text-content-muted text-xs">
                      {result.policyRule?.description ?? 'Generated from the delivered snapshot.'}
                    </p>
                  </Cell>
                  <Cell>
                    <StatusPill status={statusTone(result.result)} label={label(result.result)} />
                  </Cell>
                  <Cell muted>{label(result.confidence)}</Cell>
                  <Cell className="min-w-[260px] whitespace-normal">
                    <JsonPreview value={result.observedValue} />
                  </Cell>
                  <Cell className="min-w-[260px] whitespace-normal">
                    <JsonPreview value={result.thresholdValue} />
                  </Cell>
                </tr>
              ))}
            </WorkspaceTable>
          )}
        </Section>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card padding="lg">
          <Section title="Review activity">
            <WorkspaceTable columns={['Type', 'Status', 'Owner', 'Detail', 'Updated']}>
              {data.informationRequests.map((request) => (
                <tr key={request.id}>
                  <Cell>{label(request.requestType)}</Cell>
                  <Cell>
                    <StatusPill status={statusTone(request.status)} label={label(request.status)} />
                  </Cell>
                  <Cell muted>{request.createdById}</Cell>
                  <Cell className="max-w-md whitespace-normal">
                    <p className="text-sm">{request.message}</p>
                    {request.dueAt && (
                      <p className="text-content-muted mt-1 text-xs">
                        Due {formatMaybeDate(request.dueAt)}
                      </p>
                    )}
                    {request.applicantResponse && (
                      <div className="bg-surface-inset mt-2 rounded-lg p-2">
                        <p className="text-content-muted text-[11px] font-medium uppercase tracking-wide">
                          Applicant response
                        </p>
                        <p className="text-content mt-1 whitespace-pre-wrap text-xs">
                          {request.applicantResponse}
                        </p>
                        <p className="text-content-muted mt-1 text-[11px]">
                          Sent {formatMaybeDate(request.respondedAt)}
                        </p>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {request.status === 'applicant_responded' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            updateInformationRequestStatus.mutate({
                              id: request.id,
                              status: 'resolved',
                            })
                          }
                          loading={
                            updateInformationRequestStatus.isPending &&
                            updateInformationRequestStatus.variables?.id === request.id &&
                            updateInformationRequestStatus.variables?.status === 'resolved'
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Resolve
                        </Button>
                      )}
                      {(request.status === 'applicant_responded' ||
                        request.status === 'resolved') && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            updateInformationRequestStatus.mutate({
                              id: request.id,
                              status: 'open',
                            })
                          }
                          loading={
                            updateInformationRequestStatus.isPending &&
                            updateInformationRequestStatus.variables?.id === request.id &&
                            updateInformationRequestStatus.variables?.status === 'open'
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reopen
                        </Button>
                      )}
                      {request.status === 'open' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateInformationRequestStatus.mutate({
                              id: request.id,
                              status: 'cancelled',
                            })
                          }
                          loading={
                            updateInformationRequestStatus.isPending &&
                            updateInformationRequestStatus.variables?.id === request.id &&
                            updateInformationRequestStatus.variables?.status === 'cancelled'
                          }
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      )}
                    </div>
                    {updateInformationRequestStatus.isError &&
                      updateInformationRequestStatus.variables?.id === request.id && (
                        <p className="text-danger-strong mt-2 text-xs">
                          {(updateInformationRequestStatus.error as Error).message}
                        </p>
                      )}
                  </Cell>
                  <Cell muted>{formatMaybeDate(request.createdAt)}</Cell>
                </tr>
              ))}
              {data.decisions.map((decision) => (
                <tr key={decision.id}>
                  <Cell>{label(decision.decision)}</Cell>
                  <Cell>
                    <StatusPill
                      status={statusTone(decision.decision)}
                      label={label(decision.decision)}
                    />
                  </Cell>
                  <Cell muted>{decision.decisionMaker.name}</Cell>
                  <Cell className="max-w-md whitespace-normal">
                    <p className="text-sm">{decision.rationale}</p>
                    {decision.overrideFlag && (
                      <p className="text-warning-strong mt-1 text-xs">
                        Override: {decision.overrideReason ?? 'No reason recorded'}
                      </p>
                    )}
                  </Cell>
                  <Cell muted>{formatMaybeDate(decision.createdAt)}</Cell>
                </tr>
              ))}
              {data.informationRequests.length === 0 && data.decisions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-content-muted px-4 py-6 text-center">
                    No review actions recorded yet.
                  </td>
                </tr>
              )}
            </WorkspaceTable>
          </Section>
        </Card>

        <Card padding="lg">
          <Section title="Audit trail">
            <WorkspaceTable columns={['Action', 'Actor', 'Target', 'Time']}>
              {data.auditEvents.map((event) => (
                <tr key={event.id}>
                  <Cell>{label(event.action)}</Cell>
                  <Cell muted>{event.actorType}</Cell>
                  <Cell muted>{label(event.targetType)}</Cell>
                  <Cell muted>{formatMaybeDate(event.createdAt)}</Cell>
                </tr>
              ))}
              {data.auditEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-content-muted px-4 py-6 text-center">
                    No audit events recorded yet.
                  </td>
                </tr>
              )}
            </WorkspaceTable>
          </Section>
        </Card>
      </div>
    </PageLayout>
  )
}
