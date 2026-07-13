'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ClipboardCheck, FileText, ShieldCheck } from 'lucide-react'
import { workspaceApi, type WorkspaceAssessmentCaseDetail } from '@/lib/workspace-api'
import {
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
  under_review: 'info',
  approved: 'success',
  declined: 'danger',
  expired: 'neutral',
  cancelled: 'danger',
  revoked: 'danger',
  pass: 'success',
  fail: 'danger',
  review: 'warning',
  missing: 'warning',
}

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
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['workspace-case-detail', organisationSlug, caseId],
    queryFn: async () =>
      workspaceApi.organisations.caseDetail((await getToken())!, organisationSlug, caseId),
  })

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
            <Metric label="Assessed" value={formatMaybeDate(data.assessedAt)} />
          </MetricGroup>
        </Section>
      </Card>

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
            <WorkspaceTable columns={['Type', 'Status', 'Owner', 'Updated']}>
              {data.informationRequests.map((request) => (
                <tr key={request.id}>
                  <Cell>{label(request.requestType)}</Cell>
                  <Cell>
                    <StatusPill status={statusTone(request.status)} label={label(request.status)} />
                  </Cell>
                  <Cell muted>{request.createdById}</Cell>
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
                  <Cell muted>{formatMaybeDate(decision.createdAt)}</Cell>
                </tr>
              ))}
              {data.informationRequests.length === 0 && data.decisions.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-content-muted px-4 py-6 text-center">
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
