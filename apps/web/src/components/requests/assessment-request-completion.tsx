'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { UserButton, useAuth, useClerk, useUser } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  LockKeyhole,
  MessageSquareReply,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { workspaceApi } from '@/lib/workspace-api'
import { absoluteConsumerUrl } from '@/lib/app-urls'
import {
  Button,
  Card,
  PageHeader,
  PageLayout,
  Section,
  StatusPill,
  type StatusTone,
  buttonClasses,
} from '@/components/ui'
import { EquiScoreLogo } from '@/components/brand/logo'
import { formatMaybeDate, label } from '@/components/workspace/workspace-table'

function pounds(value: number | null): string {
  return value === null ? 'Not set' : `£${value.toLocaleString('en-GB')}`
}

function requestedFieldsLabel(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Not specified'
  const fields = (value as { fields?: unknown }).fields
  if (!Array.isArray(fields) || fields.length === 0) return 'Not specified'
  return fields.map(String).join(', ')
}

function requestStatusTone(status: string): StatusTone {
  if (status === 'assessment_delivered') return 'success'
  if (status === 'declined' || status === 'cancelled') return 'danger'
  if (status === 'expired' || status === 'information_incomplete') return 'warning'
  if (status === 'awaiting_consent' || status === 'ready_for_assessment') return 'info'
  return 'neutral'
}

function isProfileStarted(stage: string | null | undefined): boolean {
  return Boolean(stage && !['created', 'onboarding'].includes(stage))
}

export function AssessmentRequestCompletion({ requestToken }: { requestToken: string }) {
  const { getToken, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const { user } = useUser()
  const queryClient = useQueryClient()
  const requestPath = `/requests/${encodeURIComponent(requestToken)}`
  const onboardingPath = `/onboarding?request=${encodeURIComponent(requestToken)}`
  const signInUrl = absoluteConsumerUrl(`/sign-in?redirect_url=${encodeURIComponent(requestPath)}`)
  const signUpUrl = absoluteConsumerUrl(
    `/sign-up?redirect_url=${encodeURIComponent(onboardingPath)}`
  )
  const requestQueryKey = ['public-assessment-request', requestToken] as const
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [syncedStartKey, setSyncedStartKey] = useState<string | null>(null)

  useEffect(() => {
    window.localStorage.setItem('equiscore:pending-assessment-request', requestToken)
  }, [requestToken])

  const {
    data: request,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: requestQueryKey,
    queryFn: async () => workspaceApi.assessmentRequests.get(requestToken),
  })

  const { data: me } = useQuery({
    queryKey: ['me'],
    enabled: Boolean(isSignedIn),
    queryFn: async () => api.auth.me((await getToken())!),
  })

  const start = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return workspaceApi.assessmentRequests.start(token!, requestToken)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(requestQueryKey, updated)
    },
  })

  const decline = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return workspaceApi.assessmentRequests.decline(token!, requestToken)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(requestQueryKey, updated)
    },
  })

  const complete = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return workspaceApi.assessmentRequests.complete(token!, requestToken)
    },
  })

  const respondToInformationRequest = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const token = await getToken()
      return workspaceApi.assessmentRequests.respondToInformationRequest(token!, requestToken, id, {
        response,
      })
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(requestQueryKey, updated)
      setResponses((current) => ({ ...current, [variables.id]: '' }))
    },
  })

  const submitInformationResponse = (event: FormEvent, id: string) => {
    event.preventDefault()
    const response = responses[id]?.trim()
    if (!response) return
    respondToInformationRequest.mutate({ id, response })
  }

  const signedInEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null
  const requestedEmail = request?.applicant.email.toLowerCase() ?? null
  const emailMatches = Boolean(signedInEmail && requestedEmail && signedInEmail === requestedEmail)
  const profileStarted = isProfileStarted(me?.profile?.profileStage)
  const trustScoreCount = me?._count?.trustScores ?? 0
  const bankConnectionCount = me?._count?.bankConnections ?? 0
  const documentCount = me?._count?.documents ?? 0
  const hasEvidence = trustScoreCount > 0 || bankConnectionCount > 0 || documentCount > 0
  const shouldSyncStart = Boolean(
    request &&
    isSignedIn &&
    emailMatches &&
    request.isCompletable &&
    (request.status === 'invitation_sent' ||
      request.status === 'applicant_opened' ||
      (request.status === 'applicant_started' && profileStarted))
  )
  const startSyncKey = request
    ? `${request.id}:${request.status}:${profileStarted ? 'ready' : 'building'}`
    : null

  useEffect(() => {
    if (!shouldSyncStart || !startSyncKey || syncedStartKey === startSyncKey || start.isPending) {
      return
    }
    setSyncedStartKey(startSyncKey)
    start.mutate()
  }, [shouldSyncStart, startSyncKey, syncedStartKey, start])

  return (
    <div className="bg-surface-page min-h-screen">
      <header className="border-line bg-surface-card border-b px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/" aria-label="EquiScore home">
            <EquiScoreLogo width={132} />
          </Link>
          {isSignedIn && <UserButton afterSignOutUrl={`/requests/${requestToken}`} />}
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6 sm:py-10">
        <PageLayout width="narrow">
          <PageHeader
            title="Assessment request"
            description="Review the company request, sign in with the invited email, and consent to share an EquiScore assessment snapshot."
          />

          {isLoading ? (
            <Card padding="lg">
              <div className="bg-surface-hover h-48 animate-pulse rounded-xl" />
            </Card>
          ) : isError || !request ? (
            <Card padding="lg">
              <Section title="Request unavailable">
                <p className="text-content-secondary text-sm">
                  {(error as Error | undefined)?.message ?? 'This request could not be found.'}
                </p>
              </Section>
            </Card>
          ) : complete.data ? (
            <Card padding="lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-success-strong mt-0.5 h-6 w-6 shrink-0" />
                <div>
                  <h1 className="text-content text-xl font-semibold">Assessment delivered</h1>
                  <p className="text-content-secondary mt-1 text-sm">
                    {request.organisation.name} can now review the assessment case in their
                    workspace.
                  </p>
                </div>
              </div>
              <div className="border-line-subtle mt-6 grid gap-3 border-t pt-5 sm:grid-cols-2">
                <SummaryItem label="Case status" value={label(complete.data.case.status)} />
                <SummaryItem label="Outcome" value={label(complete.data.case.assessmentOutcome)} />
                <SummaryItem
                  label="Confidence"
                  value={label(complete.data.case.assessmentConfidence)}
                />
                <SummaryItem
                  label="Assessed"
                  value={formatMaybeDate(complete.data.case.assessedAt)}
                />
              </div>
            </Card>
          ) : (
            <>
              <Card padding="lg">
                <Section
                  title={
                    <span className="flex items-center gap-2">
                      <FileCheck2 className="text-brand h-5 w-5" />
                      {request.organisation.name}
                    </span>
                  }
                  action={
                    <StatusPill
                      status={requestStatusTone(request.status)}
                      label={label(request.status)}
                    />
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SummaryItem label="Applicant email" value={request.applicant.email} />
                    <SummaryItem label="Assessment type" value={label(request.assessmentType)} />
                    <SummaryItem label="Reference" value={request.reference ?? 'Not set'} />
                    <SummaryItem
                      label="Proposed commitment"
                      value={pounds(request.proposedCommitment)}
                    />
                    <SummaryItem label="Deadline" value={formatMaybeDate(request.deadline)} />
                    <SummaryItem
                      label="Policy"
                      value={request.policy?.name ?? 'Default assessment'}
                    />
                  </div>
                </Section>
              </Card>

              {request.case && (
                <Card padding="lg">
                  <Section title="Assessment status">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SummaryItem label="Case status" value={label(request.case.status)} />
                      <SummaryItem
                        label="Assessment outcome"
                        value={label(request.case.assessmentOutcome)}
                      />
                      <SummaryItem
                        label="Company decision"
                        value={label(request.case.companyDecision)}
                      />
                      <SummaryItem
                        label="Assessed"
                        value={formatMaybeDate(request.case.assessedAt)}
                      />
                    </div>
                  </Section>
                </Card>
              )}

              {request.informationRequests.length > 0 && (
                <Card padding="lg">
                  <Section
                    title={
                      <span className="flex items-center gap-2">
                        <MessageSquareReply className="text-brand h-5 w-5" />
                        Additional information
                      </span>
                    }
                  >
                    <div className="space-y-4">
                      {request.informationRequests.map((informationRequest) => {
                        const responseValue = responses[informationRequest.id] ?? ''
                        const isOpen = informationRequest.status === 'open'
                        const isSubmitting =
                          respondToInformationRequest.isPending &&
                          respondToInformationRequest.variables?.id === informationRequest.id

                        return (
                          <div
                            key={informationRequest.id}
                            className="border-line-subtle rounded-lg border p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-content font-medium">
                                  {label(informationRequest.requestType)}
                                </p>
                                <p className="text-content-secondary mt-1 text-sm">
                                  {informationRequest.message}
                                </p>
                              </div>
                              <StatusPill
                                status={isOpen ? 'warning' : 'success'}
                                label={label(informationRequest.status)}
                              />
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <SummaryItem
                                label="Requested fields"
                                value={requestedFieldsLabel(informationRequest.requestedFields)}
                              />
                              <SummaryItem
                                label="Due"
                                value={formatMaybeDate(informationRequest.dueAt)}
                              />
                            </div>

                            {informationRequest.applicantResponse && (
                              <div className="bg-surface-inset mt-4 rounded-lg p-3">
                                <p className="text-content-muted text-xs font-medium uppercase tracking-wide">
                                  Your response
                                </p>
                                <p className="text-content mt-1 whitespace-pre-wrap text-sm">
                                  {informationRequest.applicantResponse}
                                </p>
                                <p className="text-content-muted mt-2 text-xs">
                                  Sent {formatMaybeDate(informationRequest.respondedAt)}
                                </p>
                              </div>
                            )}

                            {isOpen && (
                              <form
                                onSubmit={(event) =>
                                  submitInformationResponse(event, informationRequest.id)
                                }
                                className="mt-4 space-y-3"
                              >
                                {isSignedIn ? (
                                  <>
                                    <textarea
                                      value={responseValue}
                                      onChange={(event) =>
                                        setResponses((current) => ({
                                          ...current,
                                          [informationRequest.id]: event.target.value,
                                        }))
                                      }
                                      className="border-line focus:border-brand min-h-28 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                                      rows={5}
                                      placeholder="Add the requested detail here"
                                    />
                                    {respondToInformationRequest.isError &&
                                      respondToInformationRequest.variables?.id ===
                                        informationRequest.id && (
                                        <p className="text-danger-strong text-sm">
                                          {(respondToInformationRequest.error as Error).message}
                                        </p>
                                      )}
                                    <Button
                                      type="submit"
                                      loading={isSubmitting}
                                      disabled={!responseValue.trim()}
                                    >
                                      <MessageSquareReply className="h-4 w-4" />
                                      Send response
                                    </Button>
                                  </>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-3">
                                    <Link href={signInUrl} className={buttonClasses()}>
                                      Sign in to respond
                                    </Link>
                                    <Link href={signUpUrl} className={buttonClasses('secondary')}>
                                      Create profile
                                    </Link>
                                  </div>
                                )}
                              </form>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Section>
                </Card>
              )}

              {(request.isCompletable || !request.case) && (
                <Card padding="lg">
                  <Section
                    title={
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="text-brand h-5 w-5" />
                        Authorise partner access
                      </span>
                    }
                  >
                    {request.status === 'declined' ? (
                      <div className="bg-danger-soft text-danger-strong flex items-start gap-3 rounded-lg p-4">
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                          <p className="font-medium">Request declined</p>
                          <p className="mt-1 text-sm">
                            {request.organisation.name} has not received an EquiScore assessment for
                            this request.
                          </p>
                        </div>
                      </div>
                    ) : !request.isCompletable ? (
                      <div className="bg-surface-inset flex items-start gap-3 rounded-lg p-4">
                        <Clock className="text-content-muted mt-0.5 h-5 w-5 shrink-0" />
                        <p className="text-content-secondary text-sm">
                          This request is no longer open for completion.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-content-secondary text-sm">
                          {request.organisation.name} is asking you to share a point-in-time
                          EquiScore assessment for this {label(request.assessmentType)} request.
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="bg-surface-inset rounded-lg p-4">
                            <p className="text-content text-sm font-medium">They receive</p>
                            <ul className="text-content-secondary mt-2 space-y-1.5 text-sm">
                              <li>Trust score summary and confidence level</li>
                              <li>Income, affordability and verification summaries</li>
                              <li>Assessment outcome against their policy</li>
                            </ul>
                          </div>
                          <div className="bg-surface-inset rounded-lg p-4">
                            <p className="text-content text-sm font-medium">They do not receive</p>
                            <ul className="text-content-secondary mt-2 space-y-1.5 text-sm">
                              <li>Raw bank transactions or merchant spending</li>
                              <li>Bank account numbers</li>
                              <li>Document files you uploaded</li>
                            </ul>
                          </div>
                        </div>

                        {start.isError && (
                          <p className="text-danger-strong text-sm">
                            {(start.error as Error).message}
                          </p>
                        )}

                        {isSignedIn ? (
                          <div className="space-y-3">
                            <div className="bg-surface-inset text-content-secondary rounded-lg p-3 text-sm">
                              Signed in as{' '}
                              <span className="text-content font-medium">
                                {user?.primaryEmailAddress?.emailAddress ?? 'your account'}
                              </span>
                            </div>

                            {!emailMatches ? (
                              <div className="bg-warning-soft text-warning-strong flex items-start gap-3 rounded-lg p-4">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                <div className="space-y-3">
                                  <div>
                                    <p className="font-medium">Sign in with the invited email</p>
                                    <p className="mt-1 text-sm">
                                      This request was sent to {request.applicant.email}. You are
                                      currently signed in as{' '}
                                      {user?.primaryEmailAddress?.emailAddress ?? 'another account'}
                                      .
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => void signOut({ redirectUrl: signInUrl })}
                                  >
                                    Switch account
                                  </Button>
                                </div>
                              </div>
                            ) : !profileStarted ? (
                              <div className="bg-surface-inset rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                  <LockKeyhole className="text-brand mt-0.5 h-5 w-5 shrink-0" />
                                  <div>
                                    <p className="text-content font-medium">
                                      Finish your EquiScore profile first
                                    </p>
                                    <p className="text-content-secondary mt-1 text-sm">
                                      We need your basic profile before you can authorise a partner
                                      assessment. You will return here before anything is shared.
                                    </p>
                                  </div>
                                </div>
                                <Link
                                  href={onboardingPath}
                                  className={buttonClasses('primary', 'md', 'mt-4')}
                                >
                                  Continue profile
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </div>
                            ) : (
                              <>
                                {!hasEvidence && (
                                  <div className="bg-warning-soft text-warning-strong rounded-lg p-4 text-sm">
                                    You can authorise now, but this snapshot will be based on your
                                    profile only. Connecting bank evidence or documents can improve
                                    assessment confidence.
                                  </div>
                                )}
                                {complete.isError && (
                                  <p className="text-danger-strong text-sm">
                                    {(complete.error as Error).message}
                                  </p>
                                )}
                                {decline.isError && (
                                  <p className="text-danger-strong text-sm">
                                    {(decline.error as Error).message}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3">
                                  <Button
                                    loading={complete.isPending}
                                    disabled={decline.isPending}
                                    onClick={() => complete.mutate()}
                                  >
                                    {complete.isPending
                                      ? 'Delivering assessment...'
                                      : 'Authorise and deliver assessment'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    loading={decline.isPending}
                                    disabled={complete.isPending}
                                    onClick={() => decline.mutate()}
                                  >
                                    Decline request
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <Link href={signUpUrl} className={buttonClasses()}>
                              Create profile
                            </Link>
                            <Link href={signInUrl} className={buttonClasses('secondary')}>
                              Sign in
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </Section>
                </Card>
              )}
            </>
          )}
        </PageLayout>
      </main>
    </div>
  )
}

function SummaryItem({ label: itemLabel, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-inset rounded-lg px-4 py-3">
      <p className="text-content-muted text-xs font-medium uppercase tracking-wide">{itemLabel}</p>
      <p className="text-content mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  )
}
