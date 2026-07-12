'use client'

import Link from 'next/link'
import { SignInButton, UserButton, useAuth, useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, FileCheck2, ShieldCheck } from 'lucide-react'
import { workspaceApi } from '@/lib/workspace-api'
import { Button, Card, PageHeader, PageLayout, Section, StatusPill } from '@/components/ui'
import { EquiScoreLogo } from '@/components/brand/logo'
import { formatMaybeDate, label } from '@/components/workspace/workspace-table'

function pounds(value: number | null): string {
  return value === null ? 'Not set' : `£${value.toLocaleString('en-GB')}`
}

export function AssessmentRequestCompletion({ requestToken }: { requestToken: string }) {
  const { getToken, isSignedIn } = useAuth()
  const { user } = useUser()

  const {
    data: request,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['public-assessment-request', requestToken],
    queryFn: async () => workspaceApi.assessmentRequests.get(requestToken),
  })

  const complete = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return workspaceApi.assessmentRequests.complete(token!, requestToken)
    },
  })

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
                      status={request.isCompletable ? 'neutral' : 'warning'}
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

              <Card padding="lg">
                <Section
                  title={
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="text-brand h-5 w-5" />
                      Consent to assessment
                    </span>
                  }
                >
                  {!request.isCompletable ? (
                    <div className="bg-surface-inset flex items-start gap-3 rounded-lg p-4">
                      <Clock className="text-content-muted mt-0.5 h-5 w-5 shrink-0" />
                      <p className="text-content-secondary text-sm">
                        This request is no longer open for completion.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-content-secondary text-sm">
                        By continuing, EquiScore will create a point-in-time assessment snapshot for{' '}
                        {request.organisation.name}. The snapshot excludes raw transactions,
                        merchant-level spending, bank account numbers, and document files.
                      </p>

                      {isSignedIn ? (
                        <div className="space-y-3">
                          <div className="bg-surface-inset text-content-secondary rounded-lg p-3 text-sm">
                            Signed in as{' '}
                            <span className="text-content font-medium">
                              {user?.primaryEmailAddress?.emailAddress ?? 'your account'}
                            </span>
                          </div>
                          {complete.isError && (
                            <p className="text-danger-strong text-sm">
                              {(complete.error as Error).message}
                            </p>
                          )}
                          <Button loading={complete.isPending} onClick={() => complete.mutate()}>
                            {complete.isPending
                              ? 'Delivering assessment...'
                              : 'Grant consent and deliver assessment'}
                          </Button>
                        </div>
                      ) : (
                        <SignInButton mode="modal">
                          <Button>Sign in to continue</Button>
                        </SignInButton>
                      )}
                    </div>
                  )}
                </Section>
              </Card>
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
