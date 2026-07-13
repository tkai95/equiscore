'use client'

import { FormEvent, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, LinkIcon, Plus, ShieldCheck } from 'lucide-react'
import { absoluteConsumerUrl } from '@/lib/app-urls'
import { workspaceApi, type WorkspaceSharedProfile } from '@/lib/workspace-api'
import {
  Button,
  Card,
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
  ready_to_assess: 'info',
  assessed: 'success',
  declined: 'danger',
  expired: 'neutral',
  revoked: 'danger',
}

function statusTone(status: string): StatusTone {
  return STATUS_TONES[status] ?? 'neutral'
}

function sharePurpose(profile: WorkspaceSharedProfile): string {
  const targetType = profile.share.targetType ? label(profile.share.targetType) : null
  const parts = [profile.share.targetName, targetType].map((part) => part?.trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'General share'
}

export function SharedProfilesView({ organisationSlug }: { organisationSlug: string }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [shareCode, setShareCode] = useState('')
  const [importedProfile, setImportedProfile] = useState<WorkspaceSharedProfile | null>(null)

  const {
    data: sharedProfiles = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ['workspace-shared-profiles', organisationSlug],
    queryFn: async () =>
      workspaceApi.organisations.sharedProfiles((await getToken())!, organisationSlug),
  })

  const importShare = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return workspaceApi.organisations.importSharedProfile(token!, organisationSlug, {
        shareCode,
      })
    },
    onSuccess: (profile) => {
      setShareCode('')
      setImportedProfile(profile)
      void queryClient.invalidateQueries({
        queryKey: ['workspace-shared-profiles', organisationSlug],
      })
      void queryClient.invalidateQueries({ queryKey: ['workspace-audit', organisationSlug] })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (shareCode.trim()) importShare.mutate()
  }

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Shared with us"
        description="Consumer share links imported into this organisation before any assessed case or billable usage is created."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card padding="lg">
          <Section
            title={
              <span className="flex items-center gap-2">
                <ShieldCheck className="text-brand h-4 w-4" />
                Imported shares
              </span>
            }
          >
            {isLoading ? (
              <div className="bg-surface-hover h-40 animate-pulse rounded-xl" />
            ) : error ? (
              <EmptyWorkspaceState
                title="Shared profiles unavailable"
                body={(error as Error).message}
              />
            ) : sharedProfiles.length === 0 ? (
              <EmptyWorkspaceState
                title="No shared profiles yet"
                body="Imported consumer shares will appear here before assessment."
              />
            ) : (
              <WorkspaceTable
                columns={['Applicant', 'Score', 'Share', 'Status', 'Imported', 'Actions']}
              >
                {sharedProfiles.map((profile) => {
                  const shareUrl = absoluteConsumerUrl(profile.share.path)
                  return (
                    <tr key={profile.id}>
                      <Cell>
                        <p className="font-medium">{profile.applicant.name}</p>
                        <p className="text-content-muted text-xs">{profile.applicant.email}</p>
                      </Cell>
                      <Cell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{profile.trustScore.overallScore}</span>
                          <span className="text-content-muted">/ 100</span>
                          <StatusPill
                            status="neutral"
                            label={`Tier ${profile.trustScore.overallTier}`}
                          />
                        </div>
                        <p className="text-content-muted mt-1 text-xs">
                          Scored {formatMaybeDate(profile.trustScore.computedAt)}
                        </p>
                      </Cell>
                      <Cell>
                        <p className="font-medium">{sharePurpose(profile)}</p>
                        <p className="text-content-muted text-xs">
                          {profile.share.tokenPreview} · expires{' '}
                          {formatMaybeDate(profile.share.expiresAt)}
                        </p>
                      </Cell>
                      <Cell>
                        <StatusPill
                          status={statusTone(profile.status)}
                          label={label(profile.status)}
                        />
                      </Cell>
                      <Cell muted>
                        <p>{formatMaybeDate(profile.importedAt)}</p>
                        <p className="text-xs">by {profile.importedBy.name}</p>
                      </Cell>
                      <Cell>
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="border-line bg-surface-card text-content-secondary hover:bg-surface-hover inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </a>
                      </Cell>
                    </tr>
                  )
                })}
              </WorkspaceTable>
            )}
          </Section>
        </Card>

        <Card padding="lg" className="self-start">
          <Section
            title={
              <span className="flex items-center gap-2">
                <LinkIcon className="text-brand h-4 w-4" />
                Import share
              </span>
            }
          >
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-content block text-sm font-medium" htmlFor="share-code">
                  Share link or code
                </label>
                <input
                  id="share-code"
                  value={shareCode}
                  onChange={(event) => setShareCode(event.target.value)}
                  className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="https://dev.equiscore.app/share/..."
                />
              </div>
              {importShare.isError && (
                <p className="text-danger-strong text-sm">{(importShare.error as Error).message}</p>
              )}
              {importedProfile && (
                <div className="bg-surface-inset text-content-secondary rounded-lg p-3 text-sm">
                  <p className="text-content font-medium">Share imported</p>
                  <p className="mt-1">
                    {importedProfile.applicant.name} is now visible in this organisation.
                  </p>
                </div>
              )}
              <Button type="submit" loading={importShare.isPending} disabled={!shareCode.trim()}>
                {!importShare.isPending && <Plus className="h-4 w-4" />}
                {importShare.isPending ? 'Importing...' : 'Import share'}
              </Button>
            </form>
          </Section>
        </Card>
      </div>
    </PageLayout>
  )
}
