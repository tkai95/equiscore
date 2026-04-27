'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Share2, Copy, Check, Trash2, Plus, ExternalLink, ShieldCheck } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { TierBadge } from '@/components/trust-score/tier-badge'

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
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      title="Copy link"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
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
    'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700'

  return (
    <div className="mt-4 rounded-xl border border-[#D8D6C9] bg-cream p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">New share link</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Recipient type (optional)</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className={inputClass}
          >
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
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onCreate({
              trustScoreId: score.id,
              targetType: targetType || undefined,
              targetName: targetName || undefined,
            })
          }
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream-surface hover:bg-brand-dark disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" />
          {isPending ? 'Creating…' : 'Create link'}
        </button>
      </div>
    </div>
  )
}

export function ShareProfileView() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env['NEXT_PUBLIC_APP_URL'] ?? ''

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Share profile</h1>
        <p className="text-gray-600">
          Create a secure, time-limited link to share your trust profile with landlords or lenders.
        </p>
      </div>

      {/* How it works */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { step: '1', text: 'Create a share link tied to your current trust score.' },
          { step: '2', text: 'Send the link to your landlord, lender, or agent.' },
          { step: '3', text: 'They can view your verified profile — no account needed.' },
        ].map(({ step, text }) => (
          <div key={step} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-cream-surface">
              {step}
            </div>
            <p className="text-sm text-gray-600">{text}</p>
          </div>
        ))}
      </div>

      {/* Score required gate */}
      {!isLoading && !score && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <p className="font-semibold text-gray-900">Generate your trust score first</p>
          <p className="mt-1 text-sm text-gray-600">
            You need an active trust score before you can create shareable links.
          </p>
          <a
            href="/dashboard/trust-score"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream-surface hover:bg-brand-dark"
          >
            Go to Trust Score
          </a>
        </div>
      )}

      {/* Create link button + form */}
      {score && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Create a new link</h2>
              <p className="mt-0.5 text-sm text-gray-500">Links expire after 30 days.</p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-cream-surface hover:bg-brand-dark"
              >
                <Plus className="h-4 w-4" />
                New link
              </button>
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
            <p className="mt-3 text-sm text-red-600">
              Failed — {(createMutation.error as Error).message}
            </p>
          )}
        </div>
      )}

      {/* Links list */}
      {linksLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-14 shadow-sm ring-1 ring-gray-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream">
            <Share2 className="h-7 w-7 text-brand" />
          </div>
          <p className="text-sm text-gray-500">No share links yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Active links</h2>
          {links.map((link) => {
            const shareUrl = `${appUrl}/share/${link.shareToken}`
            const expired = new Date(link.expiresAt) < new Date()
            return (
              <div
                key={link.id}
                className={cn(
                  'rounded-2xl bg-white p-5 shadow-sm ring-1',
                  expired ? 'ring-gray-100 opacity-60' : 'ring-gray-100'
                )}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {link.targetName && (
                        <span className="text-sm font-medium text-gray-900">{link.targetName}</span>
                      )}
                      {link.targetType && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {TARGET_TYPE_LABELS[link.targetType] ?? link.targetType}
                        </span>
                      )}
                      <TierBadge tier={link.trustScore.overallTier} />
                      {expired && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-gray-400">{shareUrl}</p>
                    <p className="mt-1 text-xs text-gray-400">
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
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview
                    </a>
                    <button
                      onClick={() => revokeMutation.mutate(link.id)}
                      disabled={revokeMutation.isPending || expired}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
