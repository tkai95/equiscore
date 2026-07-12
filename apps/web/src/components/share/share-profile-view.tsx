'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Share2, Copy, Check, Trash2, Plus, ExternalLink, ShieldCheck } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { TierBadge } from '@/components/trust-score/tier-badge'
import { Button, buttonClasses, Card, InsetPanel, PageHeader, PageLayout, StatusPill } from '@/components/ui'

const TARGET_TYPE_LABELS: Record<string, string> = {
  landlord: 'Landlord',
  letting_agent: 'Letting agent',
  lender: 'Lender',
  employer: 'Employer',
  other: 'Other',
}

interface ShareLink {
  id: string
  shareToken: string
  targetType: string | null
  targetName: string | null
  expiresAt: string
  createdAt: string
  viewCount: number
  lastViewedAt: string | null
  trustScore: {
    overallTier: TrustTier
    overallScore: number
    computedAt: string
  }
}

interface TrustScoreBasic {
  id: string
  overallTier: TrustTier
  overallScore: number
  computedAt: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={handleCopy} className={buttonClasses('secondary', 'sm')} title="Copy link">
      {copied ? <Check className="h-3.5 w-3.5 text-success-strong" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

function CreateLinkForm({
  score,
  onCreate,
  onCancel,
  isPending,
}: {
  score: TrustScoreBasic
  onCreate: (data: { trustScoreId: string; targetType?: string; targetName?: string }) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [targetType, setTargetType] = useState('')
  const [targetName, setTargetName] = useState('')

  const inputClass =
    'w-full rounded-lg border border-line bg-surface-card px-3 py-2.5 text-sm text-content focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
  const labelClass = 'mb-1.5 block text-sm font-medium text-content-secondary'

  return (
    <InsetPanel padding="md" className="mt-4 rounded-panel">
      <h3 className="mb-4 text-sm font-semibold text-content">New share link</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Recipient type (optional)</label>
          <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className={inputClass}>
            <option value="">Select…</option>
            {Object.entries(TARGET_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Recipient name (optional)</label>
          <input
            type="text"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="e.g. John Smith Properties"
            className={inputClass}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            onCreate({
              trustScoreId: score.id,
              targetType: targetType || undefined,
              targetName: targetName || undefined,
            })
          }
          loading={isPending}
        >
          {!isPending && <Share2 className="h-4 w-4" />}
          {isPending ? 'Creating…' : 'Create link'}
        </Button>
      </div>
    </InsetPanel>
  )
}

export function ShareProfileView() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : process.env['NEXT_PUBLIC_APP_URL'] ?? ''

  const { data: score, isLoading: scoreLoading } = useQuery({
    queryKey: ['score', 'general'],
    queryFn: async () => {
      const token = await getToken()
      return api.scores.latest(token!, 'general') as Promise<TrustScoreBasic | null>
    },
  })

  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['share-links'],
    queryFn: async () => {
      const token = await getToken()
      return api.sharing.list(token!) as Promise<ShareLink[]>
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { trustScoreId: string; targetType?: string; targetName?: string }) => {
      const token = await getToken()
      return api.sharing.create(token!, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['share-links'] })
      setShowForm(false)
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      return api.sharing.revoke(token!, id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['share-links'] })
    },
  })

  const isLoading = scoreLoading || linksLoading

  return (
    <PageLayout>
      <PageHeader
        title="Share profile"
        description="Create a secure, time-limited link to share your trust profile with landlords or lenders."
      />

      {/* How it works */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { step: '1', text: 'Create a share link tied to your current trust score.' },
          { step: '2', text: 'Send the link to your landlord, lender, or agent.' },
          { step: '3', text: 'They can view your verified profile — no account needed.' },
        ].map(({ step, text }) => (
          <Card key={step} padding="sm">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-cream-surface">
              {step}
            </div>
            <p className="text-sm text-content-secondary">{text}</p>
          </Card>
        ))}
      </div>

      {/* Score required gate */}
      {!isLoading && !score && (
        <Card className="text-center" padding="lg">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-warning-strong" />
          <p className="font-semibold text-content">Generate your trust score first</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-content-secondary">
            You need an active trust score before you can create shareable links.
          </p>
          <a href="/dashboard/trust-score" className={buttonClasses('primary', 'md', 'mt-4')}>
            Go to Trust Score
          </a>
        </Card>
      )}

      {/* Create link button + form */}
      {score && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-content">Create a new link</h2>
              <p className="mt-0.5 text-sm text-content-muted">Links expire after 30 days.</p>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="shrink-0">
                <Plus className="h-4 w-4" />
                New link
              </Button>
            )}
          </div>

          {showForm && (
            <CreateLinkForm
              score={score}
              onCreate={(data) => createMutation.mutate(data)}
              onCancel={() => setShowForm(false)}
              isPending={createMutation.isPending}
            />
          )}
          {createMutation.isError && (
            <p className="mt-3 text-sm text-danger-strong">
              Failed — {(createMutation.error as Error).message}
            </p>
          )}
        </Card>
      )}

      {/* Links list */}
      {linksLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-surface-hover" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-14">
          <div className="flex h-14 w-14 items-center justify-center rounded-panel bg-surface-inset">
            <Share2 className="h-7 w-7 text-brand-900" />
          </div>
          <p className="text-sm text-content-muted">No share links yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-content">Active links</h2>
          {links.map((link) => {
            const shareUrl = `${appUrl}/share/${link.shareToken}`
            const expired = new Date(link.expiresAt) < new Date()
            return (
              <Card key={link.id} padding="sm" className={cn(expired && 'opacity-60')}>
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {link.targetName && (
                        <span className="text-sm font-medium text-content">{link.targetName}</span>
                      )}
                      {link.targetType && (
                        <StatusPill status="neutral" label={TARGET_TYPE_LABELS[link.targetType] ?? link.targetType} />
                      )}
                      <TierBadge tier={link.trustScore.overallTier} />
                      <span className="text-xs font-medium tabular-nums text-content-muted">
                        {link.trustScore.overallScore} / 100
                      </span>
                      {expired && <StatusPill status="danger" label="Expired" />}
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-content-muted">{shareUrl}</p>
                    <p className="mt-1 text-xs text-content-muted">
                      Created {formatDate(link.createdAt)} · Expires {formatDate(link.expiresAt)}
                      {link.viewCount > 0 && ` · ${link.viewCount} view${link.viewCount > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <CopyButton text={shareUrl} />
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses('secondary', 'sm')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview
                    </a>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeMutation.mutate(link.id)}
                      disabled={revokeMutation.isPending || expired}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}
