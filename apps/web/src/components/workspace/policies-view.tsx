'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, CheckCircle2, FileCheck2, FlaskConical, Plus, Save, Trash2 } from 'lucide-react'
import {
  workspaceApi,
  type CreateWorkspacePolicyInput,
  type WorkspacePolicy,
  type WorkspacePolicyPreview,
  type WorkspacePolicyRule,
  type WorkspacePolicyRuleInput,
  type WorkspacePolicyVersion,
} from '@/lib/workspace-api'
import {
  Button,
  Card,
  Metric,
  MetricGroup,
  PageHeader,
  PageLayout,
  Section,
  StatusPill,
} from '@/components/ui'
import {
  Cell,
  EmptyWorkspaceState,
  WorkspaceTable,
  formatMaybeDate,
  label,
} from './workspace-table'

type AssessmentType = CreateWorkspacePolicyInput['assessmentType']
type RuleDraft = WorkspacePolicyRuleInput & { localId: string }

const ASSESSMENT_TYPES: Array<{ value: AssessmentType; label: string }> = [
  { value: 'rental', label: 'Rental' },
  { value: 'telecom', label: 'Telecom' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'lending', label: 'Lending' },
  { value: 'other', label: 'Other' },
]

const INPUT_FIELDS = [
  { value: 'trustScoreSummary.score', label: 'Trust score', thresholdType: 'number' },
  {
    value: 'affordabilitySummary.latestAffordabilityScore',
    label: 'Affordability score',
    thresholdType: 'number',
  },
  {
    value: 'incomeSummary.latestIncomeStabilityScore',
    label: 'Income stability score',
    thresholdType: 'number',
  },
  {
    value: 'commitmentsSummary.latestRentalReliabilityScore',
    label: 'Rental reliability score',
    thresholdType: 'number',
  },
  {
    value: 'verificationSummary.activeBankConnections',
    label: 'Active bank connections',
    thresholdType: 'number',
  },
  {
    value: 'verificationSummary.verifiedDocuments',
    label: 'Verified documents',
    thresholdType: 'number',
  },
  {
    value: 'verificationSummary.verificationStrengthScore',
    label: 'Verification strength score',
    thresholdType: 'number',
  },
  {
    value: 'verificationSummary.identityConfidenceScore',
    label: 'Identity confidence score',
    thresholdType: 'number',
  },
  {
    value: 'incomeSummary.declaredMonthlyIncome',
    label: 'Declared monthly income',
    thresholdType: 'currency',
  },
  {
    value: 'affordabilitySummary.proposedCommitment',
    label: 'Proposed commitment',
    thresholdType: 'currency',
  },
] as const

const OPERATORS = [
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'exists', label: 'Exists' },
  { value: 'not_empty', label: 'Not empty' },
] as const

function statusTone(status: string) {
  if (status === 'active' || status === 'approved') return 'success' as const
  if (status === 'awaiting_approval') return 'warning' as const
  if (status === 'retired') return 'neutral' as const
  return 'info' as const
}

function resultTone(result: string) {
  if (result === 'pass') return 'success' as const
  if (result === 'fail') return 'danger' as const
  if (result === 'missing') return 'warning' as const
  return 'neutral' as const
}

function localRule(rule?: Partial<WorkspacePolicyRuleInput>): RuleDraft {
  const field = rule?.inputField ?? INPUT_FIELDS[0].value
  const fieldMeta = INPUT_FIELDS.find((item) => item.value === field)
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: rule?.name ?? '',
    description: rule?.description,
    inputField: field,
    operator: rule?.operator ?? 'gte',
    threshold: rule?.threshold ?? '',
    thresholdType: rule?.thresholdType ?? (fieldMeta?.thresholdType as RuleDraft['thresholdType']),
    missingDataBehaviour: rule?.missingDataBehaviour ?? 'review',
    confidenceRequirement: rule?.confidenceRequirement,
    passOutcome: rule?.passOutcome,
    failOutcome: rule?.failOutcome,
    alternativePathway: rule?.alternativePathway,
    humanReviewRequired: rule?.humanReviewRequired ?? false,
    priority: rule?.priority,
  }
}

function ruleFromApi(rule: WorkspacePolicyRule): RuleDraft {
  return localRule({
    id: rule.id,
    name: rule.name,
    description: rule.description ?? undefined,
    inputField: rule.inputField,
    operator: rule.operator as RuleDraft['operator'],
    threshold: rule.threshold ?? '',
    thresholdType: (rule.thresholdType ?? undefined) as RuleDraft['thresholdType'],
    missingDataBehaviour: rule.missingDataBehaviour as RuleDraft['missingDataBehaviour'],
    confidenceRequirement: (rule.confidenceRequirement ??
      undefined) as RuleDraft['confidenceRequirement'],
    passOutcome: rule.passOutcome,
    failOutcome: rule.failOutcome,
    alternativePathway: rule.alternativePathway ?? undefined,
    humanReviewRequired: rule.humanReviewRequired,
    priority: rule.priority,
  })
}

function cleanRule(rule: RuleDraft, index: number): WorkspacePolicyRuleInput {
  const thresholdText = String(rule.threshold ?? '').trim()
  const numericThreshold = Number(thresholdText.replace(/,/g, ''))
  const threshold =
    thresholdText.length === 0
      ? undefined
      : Number.isFinite(numericThreshold)
        ? numericThreshold
        : thresholdText

  return {
    id: rule.id,
    name: rule.name.trim(),
    description: rule.description?.trim() || undefined,
    inputField: rule.inputField,
    operator: rule.operator,
    threshold,
    thresholdType: rule.thresholdType,
    missingDataBehaviour: rule.missingDataBehaviour,
    confidenceRequirement: rule.confidenceRequirement,
    passOutcome: rule.passOutcome?.trim() || undefined,
    failOutcome: rule.failOutcome?.trim() || undefined,
    alternativePathway: rule.alternativePathway?.trim() || undefined,
    humanReviewRequired: rule.humanReviewRequired,
    priority: index + 1,
  }
}

function valueText(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Missing'
  if (typeof value === 'number') return value.toLocaleString('en-GB')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function lastPreviewFrom(version: WorkspacePolicyVersion | null | undefined) {
  if (!version?.testResults || typeof version.testResults !== 'object') return null
  const preview = (version.testResults as { lastPreview?: unknown }).lastPreview
  if (!preview || typeof preview !== 'object') return null
  return preview as { generatedAt?: string; summary?: WorkspacePolicyPreview['summary'] }
}

export function PoliciesView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null)
  const [rules, setRules] = useState<RuleDraft[]>([])
  const [aiPrompt, setAiPrompt] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [preview, setPreview] = useState<WorkspacePolicyPreview | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    assessmentType: 'rental' as AssessmentType,
    aiPrompt: '',
  })

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['workspace-policies', organisationSlug],
    queryFn: async () => workspaceApi.organisations.policies((await getToken())!, organisationSlug),
  })

  const selectedPolicy = useMemo(() => {
    if (selectedPolicyId) return policies.find((policy) => policy.id === selectedPolicyId) ?? null
    return policies[0] ?? null
  }, [policies, selectedPolicyId])

  const selectedVersion = selectedPolicy?.latestVersion ?? null
  const isDraft = selectedVersion?.status === 'draft'
  const isAwaitingApproval = selectedVersion?.status === 'awaiting_approval'
  const previewSnapshot = preview ?? null
  const persistedPreview = lastPreviewFrom(selectedVersion)

  useEffect(() => {
    if (!selectedPolicyId && policies[0]) setSelectedPolicyId(policies[0].id)
  }, [policies, selectedPolicyId])

  useEffect(() => {
    setRules(selectedVersion?.rules.map(ruleFromApi) ?? [])
    setAiPrompt('')
    setChangeSummary(selectedVersion?.changeSummary ?? '')
    setPreview(null)
  }, [selectedVersion?.id, selectedVersion?.changeSummary, selectedVersion?.rules])

  const refreshPolicies = async () => {
    await queryClient.invalidateQueries({ queryKey: ['workspace-policies', organisationSlug] })
  }

  const createPolicy = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return workspaceApi.organisations.createPolicy(token!, organisationSlug, {
        name: createForm.name,
        assessmentType: createForm.assessmentType,
        aiPrompt: createForm.aiPrompt || undefined,
      })
    },
    onSuccess: async (policy) => {
      setCreateForm({ name: '', assessmentType: 'rental', aiPrompt: '' })
      setSelectedPolicyId(policy.id)
      await refreshPolicies()
    },
  })

  const saveDraft = useMutation({
    mutationFn: async () => {
      if (!selectedPolicy || !selectedVersion) throw new Error('No policy version selected')
      const token = await getToken()
      return workspaceApi.organisations.updatePolicyVersion(
        token!,
        organisationSlug,
        selectedPolicy.id,
        selectedVersion.id,
        {
          rules: rules.map(cleanRule).filter((rule) => rule.name),
          aiPrompt: aiPrompt || undefined,
          changeSummary: changeSummary || undefined,
        }
      )
    },
    onSuccess: refreshPolicies,
  })

  const submitVersion = useMutation({
    mutationFn: async () => {
      if (!selectedPolicy || !selectedVersion) throw new Error('No policy version selected')
      const token = await getToken()
      return workspaceApi.organisations.submitPolicyVersion(
        token!,
        organisationSlug,
        selectedPolicy.id,
        selectedVersion.id
      )
    },
    onSuccess: refreshPolicies,
  })

  const approveVersion = useMutation({
    mutationFn: async () => {
      if (!selectedPolicy || !selectedVersion) throw new Error('No policy version selected')
      const token = await getToken()
      return workspaceApi.organisations.approvePolicyVersion(
        token!,
        organisationSlug,
        selectedPolicy.id,
        selectedVersion.id
      )
    },
    onSuccess: refreshPolicies,
  })

  const retirePolicy = useMutation({
    mutationFn: async () => {
      if (!selectedPolicy) throw new Error('No policy selected')
      const token = await getToken()
      return workspaceApi.organisations.retirePolicy(token!, organisationSlug, selectedPolicy.id)
    },
    onSuccess: refreshPolicies,
  })

  const previewPolicy = useMutation({
    mutationFn: async () => {
      if (!selectedPolicy || !selectedVersion) throw new Error('No policy version selected')
      const token = await getToken()
      return workspaceApi.organisations.previewPolicyVersion(
        token!,
        organisationSlug,
        selectedPolicy.id,
        selectedVersion.id
      )
    },
    onSuccess: async (result) => {
      setPreview(result)
      await refreshPolicies()
    },
  })

  const createSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (createForm.name.trim()) createPolicy.mutate()
  }

  const updateRule = (localId: string, patch: Partial<RuleDraft>) => {
    setRules((current) =>
      current.map((rule) => {
        if (rule.localId !== localId) return rule
        const next = { ...rule, ...patch }
        if (patch.inputField) {
          const field = INPUT_FIELDS.find((item) => item.value === patch.inputField)
          next.thresholdType = field?.thresholdType as RuleDraft['thresholdType']
        }
        return next
      })
    )
  }

  return (
    <PageLayout width="wide">
      <PageHeader title="Policies" />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card padding="lg">
            <Section title="Policy library">
              {isLoading ? (
                <div className="bg-surface-hover h-40 animate-pulse rounded-xl" />
              ) : policies.length === 0 ? (
                <EmptyWorkspaceState
                  title="No policies yet"
                  body="Create a draft policy to define assessment criteria before requests start using it."
                />
              ) : (
                <div className="space-y-2">
                  {policies.map((policy) => (
                    <button
                      key={policy.id}
                      type="button"
                      onClick={() => setSelectedPolicyId(policy.id)}
                      className={`border-line w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        selectedPolicy?.id === policy.id
                          ? 'bg-brand-50 ring-brand-100 ring-1'
                          : 'bg-surface-card hover:bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-content font-medium">{policy.name}</p>
                          <p className="text-content-muted mt-1 text-xs">
                            {label(policy.assessmentType)} · {policy.versionCount} version
                            {policy.versionCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <StatusPill
                          status={statusTone(policy.status)}
                          label={label(policy.status)}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          <Card padding="lg">
            <Section
              title={
                <span className="flex items-center gap-2">
                  <Bot className="text-brand h-4 w-4" />
                  New draft
                </span>
              }
            >
              <form onSubmit={createSubmit} className="space-y-4">
                <div>
                  <label className="text-content block text-sm font-medium" htmlFor="policy-name">
                    Policy name
                  </label>
                  <input
                    id="policy-name"
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    placeholder="Rental readiness policy"
                  />
                </div>
                <div>
                  <label className="text-content block text-sm font-medium" htmlFor="policy-type">
                    Assessment type
                  </label>
                  <select
                    id="policy-type"
                    value={createForm.assessmentType}
                    onChange={(event) =>
                      setCreateForm((current) => ({
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
                  <label className="text-content block text-sm font-medium" htmlFor="policy-ai">
                    Workflow guidance
                  </label>
                  <textarea
                    id="policy-ai"
                    value={createForm.aiPrompt}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, aiPrompt: event.target.value }))
                    }
                    rows={4}
                    className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                    placeholder="Describe the policy shape. The builder will create starter rules for review."
                  />
                </div>
                {createPolicy.isError && (
                  <p className="text-danger-strong text-sm">
                    {(createPolicy.error as Error).message}
                  </p>
                )}
                <Button
                  type="submit"
                  loading={createPolicy.isPending}
                  disabled={!createForm.name.trim()}
                >
                  {!createPolicy.isPending && <Plus className="h-4 w-4" />}
                  {createPolicy.isPending ? 'Creating...' : 'Create draft'}
                </Button>
              </form>
            </Section>
          </Card>
        </div>

        {selectedPolicy && selectedVersion ? (
          <div className="space-y-6">
            <Card padding="lg">
              <Section
                title={selectedPolicy.name}
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill
                      status={statusTone(selectedVersion.status)}
                      label={label(selectedVersion.status)}
                    />
                    <StatusPill
                      status={statusTone(selectedPolicy.status)}
                      label={label(selectedPolicy.status)}
                    />
                  </div>
                }
              >
                <MetricGroup>
                  <Metric label="Version" value={`v${selectedVersion.versionNumber}`} />
                  <Metric label="Rules" value={selectedVersion.rules.length} />
                  <Metric label="Approved" value={formatMaybeDate(selectedVersion.approvedAt)} />
                  <Metric label="Updated" value={formatMaybeDate(selectedPolicy.updatedAt)} />
                </MetricGroup>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      className="text-content block text-sm font-medium"
                      htmlFor="change-summary"
                    >
                      Change summary
                    </label>
                    <input
                      id="change-summary"
                      value={changeSummary}
                      disabled={!isDraft}
                      onChange={(event) => setChangeSummary(event.target.value)}
                      className="border-line focus:border-brand disabled:bg-surface-hover mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      placeholder="What changed in this version?"
                    />
                  </div>
                  <div>
                    <label className="text-content block text-sm font-medium" htmlFor="ai-guidance">
                      AI workflow guidance
                    </label>
                    <input
                      id="ai-guidance"
                      value={aiPrompt}
                      disabled={!isDraft}
                      onChange={(event) => setAiPrompt(event.target.value)}
                      className="border-line focus:border-brand disabled:bg-surface-hover mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                      placeholder="Optional: revise starter rule guidance"
                    />
                  </div>
                </div>
              </Section>
            </Card>

            <Card padding="lg">
              <Section
                title={
                  <span className="flex items-center gap-2">
                    <FileCheck2 className="text-brand h-4 w-4" />
                    Criteria editor
                  </span>
                }
                action={
                  isDraft ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setRules((current) => [...current, localRule()])}
                    >
                      <Plus className="h-4 w-4" />
                      Add rule
                    </Button>
                  ) : null
                }
              >
                {rules.length === 0 ? (
                  <EmptyWorkspaceState
                    title="No rules in this version"
                    body="Add a rule or create a new draft with workflow guidance to generate starter criteria."
                  />
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule, index) => (
                      <div
                        key={rule.localId}
                        className="border-line bg-surface-card rounded-xl border p-4"
                      >
                        <div className="grid gap-3 lg:grid-cols-[1.3fr_1.4fr_92px_120px_150px_42px]">
                          <div>
                            <label className="text-content-muted text-xs font-medium uppercase">
                              Rule
                            </label>
                            <input
                              value={rule.name}
                              disabled={!isDraft}
                              onChange={(event) =>
                                updateRule(rule.localId, { name: event.target.value })
                              }
                              className="border-line focus:border-brand disabled:bg-surface-hover mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                              placeholder={`Rule ${index + 1}`}
                            />
                          </div>
                          <div>
                            <label className="text-content-muted text-xs font-medium uppercase">
                              Field
                            </label>
                            <select
                              value={rule.inputField}
                              disabled={!isDraft}
                              onChange={(event) =>
                                updateRule(rule.localId, { inputField: event.target.value })
                              }
                              className="border-line focus:border-brand disabled:bg-surface-hover mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                            >
                              {INPUT_FIELDS.map((field) => (
                                <option key={field.value} value={field.value}>
                                  {field.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-content-muted text-xs font-medium uppercase">
                              Test
                            </label>
                            <select
                              value={rule.operator}
                              disabled={!isDraft}
                              onChange={(event) =>
                                updateRule(rule.localId, {
                                  operator: event.target.value as RuleDraft['operator'],
                                })
                              }
                              className="border-line focus:border-brand disabled:bg-surface-hover mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                            >
                              {OPERATORS.map((operator) => (
                                <option key={operator.value} value={operator.value}>
                                  {operator.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-content-muted text-xs font-medium uppercase">
                              Threshold
                            </label>
                            <input
                              value={String(rule.threshold ?? '')}
                              disabled={!isDraft || ['exists', 'not_empty'].includes(rule.operator)}
                              onChange={(event) =>
                                updateRule(rule.localId, { threshold: event.target.value })
                              }
                              className="border-line focus:border-brand disabled:bg-surface-hover mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                              placeholder="Value"
                            />
                          </div>
                          <div>
                            <label className="text-content-muted text-xs font-medium uppercase">
                              Missing data
                            </label>
                            <select
                              value={rule.missingDataBehaviour}
                              disabled={!isDraft}
                              onChange={(event) =>
                                updateRule(rule.localId, {
                                  missingDataBehaviour: event.target
                                    .value as RuleDraft['missingDataBehaviour'],
                                })
                              }
                              className="border-line focus:border-brand disabled:bg-surface-hover mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                            >
                              <option value="review">Review</option>
                              <option value="fail">Fail</option>
                              <option value="ignore">Ignore</option>
                            </select>
                          </div>
                          <div className="flex items-end justify-end">
                            <button
                              type="button"
                              disabled={!isDraft || rules.length === 1}
                              onClick={() =>
                                setRules((current) =>
                                  current.filter((item) => item.localId !== rule.localId)
                                )
                              }
                              className="text-content-muted hover:bg-surface-hover hover:text-danger-strong rounded-lg p-2 disabled:pointer-events-none disabled:opacity-40"
                              aria-label="Remove rule"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <label className="text-content-secondary mt-3 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(rule.humanReviewRequired)}
                            disabled={!isDraft}
                            onChange={(event) =>
                              updateRule(rule.localId, {
                                humanReviewRequired: event.target.checked,
                              })
                            }
                            className="border-line text-brand h-4 w-4 rounded"
                          />
                          Human review required even when this rule passes
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    loading={previewPolicy.isPending}
                    disabled={!selectedVersion || selectedVersion.rules.length === 0}
                    onClick={() => previewPolicy.mutate()}
                  >
                    {!previewPolicy.isPending && <FlaskConical className="h-4 w-4" />}
                    {previewPolicy.isPending ? 'Previewing...' : 'Preview against cases'}
                  </Button>
                  {isDraft && (
                    <Button
                      type="button"
                      loading={saveDraft.isPending}
                      disabled={rules.length === 0}
                      onClick={() => saveDraft.mutate()}
                    >
                      {!saveDraft.isPending && <Save className="h-4 w-4" />}
                      {saveDraft.isPending ? 'Saving...' : 'Save draft'}
                    </Button>
                  )}
                  {isDraft && (
                    <Button
                      type="button"
                      variant="tertiary"
                      loading={submitVersion.isPending}
                      disabled={rules.length === 0}
                      onClick={() => submitVersion.mutate()}
                    >
                      Submit for approval
                    </Button>
                  )}
                  {isAwaitingApproval && (
                    <Button
                      type="button"
                      loading={approveVersion.isPending}
                      onClick={() => approveVersion.mutate()}
                    >
                      {!approveVersion.isPending && <CheckCircle2 className="h-4 w-4" />}
                      {approveVersion.isPending ? 'Activating...' : 'Approve and activate'}
                    </Button>
                  )}
                  {selectedPolicy.status !== 'retired' && (
                    <Button
                      type="button"
                      variant="destructive"
                      loading={retirePolicy.isPending}
                      onClick={() => retirePolicy.mutate()}
                    >
                      Retire policy
                    </Button>
                  )}
                </div>

                {(saveDraft.isError ||
                  submitVersion.isError ||
                  approveVersion.isError ||
                  retirePolicy.isError ||
                  previewPolicy.isError) && (
                  <p className="text-danger-strong text-sm">
                    {
                      (
                        (saveDraft.error ||
                          submitVersion.error ||
                          approveVersion.error ||
                          retirePolicy.error ||
                          previewPolicy.error) as Error
                      ).message
                    }
                  </p>
                )}
              </Section>
            </Card>

            <Card padding="lg">
              <Section
                title={
                  <span className="flex items-center gap-2">
                    <FlaskConical className="text-brand h-4 w-4" />
                    Preview results
                  </span>
                }
              >
                {previewSnapshot ? (
                  <div className="space-y-4">
                    <MetricGroup>
                      <Metric label="Cases tested" value={previewSnapshot.summary.casesEvaluated} />
                      <Metric label="Pass" value={previewSnapshot.summary.pass} tone="positive" />
                      <Metric label="Review" value={previewSnapshot.summary.review} />
                      <Metric label="Fail" value={previewSnapshot.summary.fail} tone="negative" />
                    </MetricGroup>
                    {previewSnapshot.rows.length === 0 ? (
                      <EmptyWorkspaceState
                        title="No cases to test yet"
                        body="Once this organisation has assessment cases, previews will show how a draft policy performs before activation."
                      />
                    ) : (
                      <WorkspaceTable
                        columns={['Applicant', 'Policy result', 'Current outcome', 'Rule detail']}
                      >
                        {previewSnapshot.rows.slice(0, 8).map((row) => (
                          <tr key={row.caseId}>
                            <Cell>
                              <p className="font-medium">{row.applicant.name}</p>
                              <p className="text-content-muted text-xs">{row.applicant.email}</p>
                            </Cell>
                            <Cell>
                              <StatusPill
                                status={resultTone(row.outcome)}
                                label={label(row.outcome)}
                              />
                            </Cell>
                            <Cell muted>{label(row.currentOutcome)}</Cell>
                            <Cell className="min-w-[360px] whitespace-normal">
                              <div className="space-y-1">
                                {row.ruleResults.map((result) => (
                                  <div
                                    key={result.ruleId}
                                    className="flex flex-wrap items-center gap-2 text-xs"
                                  >
                                    <StatusPill
                                      status={resultTone(result.result)}
                                      label={label(result.result)}
                                    />
                                    <span className="text-content-secondary">{result.name}</span>
                                    <span className="text-content-muted">
                                      {valueText(result.observedValue)} {result.operator}{' '}
                                      {valueText(result.thresholdValue)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </Cell>
                          </tr>
                        ))}
                      </WorkspaceTable>
                    )}
                  </div>
                ) : persistedPreview?.summary ? (
                  <div className="bg-surface-inset rounded-xl p-4">
                    <p className="text-content font-medium">Last preview</p>
                    <p className="text-content-secondary mt-1 text-sm">
                      {persistedPreview.summary.casesEvaluated} cases tested on{' '}
                      {formatMaybeDate(persistedPreview.generatedAt)}. Pass:{' '}
                      {persistedPreview.summary.pass}, review: {persistedPreview.summary.review},
                      fail: {persistedPreview.summary.fail}.
                    </p>
                  </div>
                ) : (
                  <EmptyWorkspaceState
                    title="No preview run yet"
                    body="Run a preview to test this policy version against recent assessment cases before approval."
                  />
                )}
              </Section>
            </Card>
          </div>
        ) : (
          <Card padding="lg">
            <EmptyWorkspaceState
              title="Create a policy to start"
              body="Policy drafts define the criteria used by future company assessment requests."
            />
          </Card>
        )}
      </div>
    </PageLayout>
  )
}
