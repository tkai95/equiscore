'use client'

import { FormEvent, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, FileClock, Plus } from 'lucide-react'
import { workspaceApi, type CreateWorkspaceAssessmentRequestInput } from '@/lib/workspace-api'
import { absoluteConsumerUrl } from '@/lib/app-urls'
import { Button, Card, PageHeader, PageLayout, Section, StatusPill } from '@/components/ui'
import {
  Cell,
  EmptyWorkspaceState,
  WorkspaceTable,
  formatMaybeDate,
  label,
} from './workspace-table'

type AssessmentType = CreateWorkspaceAssessmentRequestInput['assessmentType']

const ASSESSMENT_TYPES: Array<{ value: AssessmentType; label: string }> = [
  { value: 'rental', label: 'Rental' },
  { value: 'telecom', label: 'Telecom' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'lending', label: 'Lending' },
  { value: 'other', label: 'Other' },
]

function absoluteRequestUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return absoluteConsumerUrl(path)
}

export function AssessmentRequestsView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    applicantEmail: '',
    applicantName: '',
    assessmentType: 'rental' as AssessmentType,
    proposedCommitment: '',
    reference: '',
    deadline: '',
  })
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['workspace-requests', organisationSlug],
    queryFn: async () => workspaceApi.organisations.requests((await getToken())!, organisationSlug),
  })

  const create = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      const commitment = form.proposedCommitment.trim()
        ? Number.parseFloat(form.proposedCommitment)
        : undefined
      return workspaceApi.organisations.createRequest(token!, organisationSlug, {
        applicantEmail: form.applicantEmail,
        applicantName: form.applicantName || undefined,
        assessmentType: form.assessmentType,
        proposedCommitment: Number.isFinite(commitment) ? commitment : undefined,
        reference: form.reference || undefined,
        deadline: form.deadline
          ? new Date(`${form.deadline}T23:59:59.000Z`).toISOString()
          : undefined,
      })
    },
    onSuccess: (request) => {
      setForm({
        applicantEmail: '',
        applicantName: '',
        assessmentType: 'rental',
        proposedCommitment: '',
        reference: '',
        deadline: '',
      })
      setCreatedLink(absoluteRequestUrl(request.requestUrl))
      void queryClient.invalidateQueries({ queryKey: ['workspace-requests', organisationSlug] })
      void queryClient.invalidateQueries({ queryKey: ['workspace-overview', organisationSlug] })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (form.applicantEmail.trim()) create.mutate()
  }

  const copyLink = async (id: string, path: string | null | undefined) => {
    const url = absoluteRequestUrl(path)
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <PageLayout width="wide">
      <PageHeader title="Assessment requests" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card padding="lg">
          <Section
            title={
              <span className="flex items-center gap-2">
                <FileClock className="text-brand h-4 w-4" />
                Request ledger
              </span>
            }
          >
            {isLoading ? (
              <div className="bg-surface-hover h-40 animate-pulse rounded-xl" />
            ) : requests.length === 0 ? (
              <EmptyWorkspaceState
                title="No assessment requests yet"
                body="Create a request to generate a secure applicant consent link."
              />
            ) : (
              <WorkspaceTable
                columns={[
                  'Applicant',
                  'Type',
                  'Status',
                  'Reference',
                  'Commitment',
                  'Deadline',
                  'Link',
                ]}
              >
                {requests.map((request) => {
                  const canCopy = Boolean(request.requestUrl && request.status !== 'cancelled')
                  return (
                    <tr key={request.id}>
                      <Cell>
                        <p className="font-medium">{request.applicant.name}</p>
                        <p className="text-content-muted text-xs">{request.applicant.email}</p>
                      </Cell>
                      <Cell>{label(request.assessmentType)}</Cell>
                      <Cell>
                        <StatusPill
                          status={request.status === 'assessment_delivered' ? 'success' : 'neutral'}
                          label={label(request.status)}
                        />
                      </Cell>
                      <Cell muted>{request.reference ?? 'None'}</Cell>
                      <Cell muted>
                        {request.proposedCommitment
                          ? `£${request.proposedCommitment.toLocaleString('en-GB')}`
                          : 'Not set'}
                      </Cell>
                      <Cell muted>{formatMaybeDate(request.deadline)}</Cell>
                      <Cell>
                        {canCopy ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyLink(request.id, request.requestUrl)}
                              className="border-line bg-surface-card text-content-secondary hover:bg-surface-hover inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
                            >
                              {copied === request.id ? (
                                <Check className="text-success-strong h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              {copied === request.id ? 'Copied' : 'Copy'}
                            </button>
                            <a
                              href={request.requestUrl ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand hover:bg-brand-50 rounded-md p-1.5 transition-colors"
                              aria-label="Open request"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-content-muted">Unavailable</span>
                        )}
                      </Cell>
                    </tr>
                  )
                })}
              </WorkspaceTable>
            )}
          </Section>
        </Card>

        <Card padding="lg" className="self-start">
          <Section title="Create request">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-content block text-sm font-medium" htmlFor="request-email">
                  Applicant email
                </label>
                <input
                  id="request-email"
                  type="email"
                  value={form.applicantEmail}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, applicantEmail: event.target.value }))
                  }
                  className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="applicant@example.com"
                />
              </div>
              <div>
                <label className="text-content block text-sm font-medium" htmlFor="request-name">
                  Applicant name
                </label>
                <input
                  id="request-name"
                  value={form.applicantName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, applicantName: event.target.value }))
                  }
                  className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div>
                  <label className="text-content block text-sm font-medium" htmlFor="request-type">
                    Type
                  </label>
                  <select
                    id="request-type"
                    value={form.assessmentType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        assessmentType: event.target.value as AssessmentType,
                      }))
                    }
                    className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  >
                    {ASSESSMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="text-content block text-sm font-medium"
                    htmlFor="request-deadline"
                  >
                    Deadline
                  </label>
                  <input
                    id="request-deadline"
                    type="date"
                    value={form.deadline}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, deadline: event.target.value }))
                    }
                    className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-content block text-sm font-medium"
                  htmlFor="request-commitment"
                >
                  Proposed commitment
                </label>
                <input
                  id="request-commitment"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.proposedCommitment}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, proposedCommitment: event.target.value }))
                  }
                  className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Monthly amount, if relevant"
                />
              </div>
              <div>
                <label
                  className="text-content block text-sm font-medium"
                  htmlFor="request-reference"
                >
                  Internal reference
                </label>
                <input
                  id="request-reference"
                  value={form.reference}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, reference: event.target.value }))
                  }
                  className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Application or tenancy ID"
                />
              </div>
              {create.isError && (
                <p className="text-danger-strong text-sm">{(create.error as Error).message}</p>
              )}
              {createdLink && (
                <div className="bg-surface-inset text-content-secondary rounded-lg p-3 text-sm">
                  <p className="text-content font-medium">Request link ready</p>
                  <button
                    type="button"
                    onClick={() => copyLink('created', createdLink)}
                    className="border-line bg-surface-card text-content-secondary hover:bg-surface-hover mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors"
                  >
                    {copied === 'created' ? (
                      <Check className="text-success-strong h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{createdLink}</span>
                  </button>
                </div>
              )}
              <Button
                type="submit"
                loading={create.isPending}
                disabled={!form.applicantEmail.trim()}
              >
                {!create.isPending && <Plus className="h-4 w-4" />}
                {create.isPending ? 'Creating...' : 'Create request'}
              </Button>
            </form>
          </Section>
        </Card>
      </div>
    </PageLayout>
  )
}
