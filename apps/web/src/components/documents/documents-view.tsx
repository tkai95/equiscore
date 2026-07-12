'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { FileText, Upload, Trash2, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Button, Card, PageTitle, StatusPill, type StatusTone } from '@/components/ui'

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  national_id: 'National ID',
  biometric_residence_permit: 'Biometric Residence Permit',
  driving_licence: 'Driving Licence',
  bank_statement: 'Bank Statement',
  payslip: 'Payslip',
  employment_letter: 'Employment Letter',
  tenancy_agreement: 'Tenancy Agreement',
  utility_bill: 'Utility Bill',
  p60: 'P60',
  p45: 'P45',
  tax_return: 'Tax Return',
  other: 'Other',
}

// Bank statements are NOT here — they belong on the Connections page, where
// they're actually read and scored. This page is for identity & supporting
// documents (income/employment, address), which are stored as evidence.
const DOCUMENT_CATEGORIES = [
  {
    label: 'Identity',
    types: ['passport', 'national_id', 'biometric_residence_permit', 'driving_licence'],
  },
  {
    label: 'Income & employment',
    types: ['payslip', 'employment_letter', 'p60', 'p45', 'tax_return'],
  },
  {
    label: 'Housing',
    types: ['tenancy_agreement', 'utility_bill'],
  },
  {
    label: 'Other',
    types: ['other'],
  },
]

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

interface DocAnomaly {
  code: string
  severity: 'high' | 'medium' | 'low'
  message: string
}

interface DocMetadata {
  readable?: boolean
  looksAuthentic?: boolean
  detectedDocumentType?: string | null
  nameMatch?: boolean | null
  dobMatch?: boolean | null
  addressMatch?: boolean | null
  expired?: boolean
  anomalies?: DocAnomaly[]
}

interface UploadedDocument {
  id: string
  documentType: string
  fileUrl: string
  mimeType: string
  fileSizeBytes: number | null
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'needs_review'
  extractedMetadata: DocMetadata | null
  uploadedAt: string
}

const STATUS_CONFIG: Record<
  UploadedDocument['verificationStatus'],
  { icon: typeof Clock; label: string; tone: StatusTone }
> = {
  pending: { icon: Clock, label: 'Checking…', tone: 'warning' },
  verified: { icon: CheckCircle, label: 'Verified', tone: 'success' },
  rejected: { icon: XCircle, label: 'Couldn’t verify', tone: 'danger' },
  needs_review: { icon: AlertCircle, label: 'Needs review', tone: 'warning' },
}

const IDENTITY_TYPES = ['passport', 'national_id', 'biometric_residence_permit', 'driving_licence']
const ADDRESS_TYPES = ['utility_bill', 'tenancy_agreement', 'bank_statement', 'driving_licence', 'biometric_residence_permit']

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 } as const

/** The most serious "doesn't line up" finding, if any. */
function topAnomaly(m: DocMetadata | null): DocAnomaly | null {
  const list = m?.anomalies ?? []
  if (list.length === 0) return null
  return [...list].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])[0]!
}

/** A plain-English line for what the read actually confirmed (or why it didn't). */
function verificationDetail(doc: UploadedDocument): string | null {
  const m = doc.extractedMetadata
  const isId = IDENTITY_TYPES.includes(doc.documentType)
  const isAddr = ADDRESS_TYPES.includes(doc.documentType)
  const anomaly = topAnomaly(m)

  if (doc.verificationStatus === 'pending') return 'Reading and checking your document…'
  if (doc.verificationStatus === 'rejected') {
    // Two very different causes hide behind "rejected": we couldn't READ it, or
    // we read it but it didn't look like a genuine document of this kind.
    if (m && m.readable === false)
      return 'We couldn’t read the details clearly — try a sharper photo, good lighting, or the original PDF.'
    if (m && m.looksAuthentic === false)
      return `We read this but it didn’t look like a genuine ${DOCUMENT_TYPE_LABELS[doc.documentType]?.toLowerCase() ?? 'document'}${m.detectedDocumentType ? ` (it scanned as: ${m.detectedDocumentType})` : ''}. Upload a real, unedited photo or PDF — sample or specimen documents are rejected.`
    return 'We couldn’t read this as a valid document. Try a clearer photo or PDF.'
  }
  if (doc.verificationStatus === 'verified') {
    // A minor caveat can survive verification (e.g. a slightly old bill).
    if (anomaly) return anomaly.message
    if (isId) return m?.dobMatch ? 'Name and date of birth confirmed against your profile.' : 'Name confirmed against your profile.'
    if (isAddr) return 'Address confirmed against your profile.'
    return 'Confirmed as genuine income evidence.'
  }
  // needs_review — lead with a cross-check that didn't line up.
  if (anomaly) return anomaly.message
  if (m?.expired) return 'This document has expired — please upload a current one.'
  if (m?.nameMatch === false) return 'The name on this document didn’t match your profile.'
  if (m?.addressMatch === false) return 'The address didn’t match your current address on file.'
  if (isId && m?.nameMatch == null) return 'We couldn’t read a name to match against your profile.'
  return 'Uploaded — awaiting a manual review.'
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsView() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedType, setSelectedType] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const token = await getToken()
      return api.documents.list(token!) as Promise<UploadedDocument[]>
    },
    // Verification runs in the background (a Claude read), so poll while any
    // document is still being checked, then go quiet.
    refetchInterval: (query) =>
      (query.state.data as UploadedDocument[] | undefined)?.some((d) => d.verificationStatus === 'pending')
        ? 3000
        : false,
  })

  // When a document finishes verifying, the server has recomputed the score —
  // refresh every score-derived view so the Assessment page reflects it without
  // a manual reload. (Verification is async, so this fires on the poll that sees
  // a document leave the 'pending' state.)
  const prevPending = useRef<Set<string>>(new Set())
  useEffect(() => {
    const nowPending = new Set(
      documents.filter((d) => d.verificationStatus === 'pending').map((d) => d.id)
    )
    const finished = [...prevPending.current].some((id) => !nowPending.has(id))
    prevPending.current = nowPending
    if (finished) {
      for (const key of [['score'], ['score-improvements'], ['insight-profile'], ['analytics-summary']]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    }
  }, [documents, queryClient])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id)
      const token = await getToken()
      return api.documents.delete(token!, id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onSettled: () => setDeletingId(null),
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedType) return

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setUploadError('Only PDF, JPEG, PNG, and WebP files are accepted.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File must be under 10 MB.')
      return
    }

    setUploadError(null)
    setIsUploading(true)

    try {
      const token = await getToken()

      // Server-side store: send the file to our API, which holds the storage
      // credentials. No browser signing → no presigned-POST rejections.
      await api.documents.upload(token!, selectedType, file)

      void queryClient.invalidateQueries({ queryKey: ['documents'] })
      setSelectedType('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setUploadError((err as Error).message ?? 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const groupedDocs = documents.reduce<Record<string, UploadedDocument[]>>((acc, doc) => {
    const cat =
      DOCUMENT_CATEGORIES.find((c) => c.types.includes(doc.documentType))?.label ?? 'Other'
    ;(acc[cat] ??= []).push(doc)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <div>
        <PageTitle>Documents</PageTitle>
        <p className="mt-1 text-sm text-content-secondary">Upload supporting documents to strengthen your trust profile.</p>
      </div>

      {/* Upload panel */}
      <Card padding="md">
        <h2 className="mb-1 font-semibold text-content">Upload a document</h2>
        <p className="mb-4 text-sm text-content-secondary">
          Identity and supporting documents. Uploading a{' '}
          <strong>bank statement</strong>?{' '}
          <Link href="/dashboard/connections" className="font-medium text-brand-900 hover:underline">
            Add it on Bank connections
          </Link>{' '}
          instead — we&apos;ll read it and build your profile.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-content">Document type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-card px-3 py-2.5 text-sm text-content focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Select a type…</option>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <optgroup key={cat.label} label={cat.label}>
                  {cat.types.map((t) => (
                    <option key={t} value={t}>
                      {DOCUMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={!selectedType || isUploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedType}
              loading={isUploading}
            >
              {!isUploading && <Upload className="h-4 w-4" />}
              {isUploading ? 'Uploading…' : 'Choose file'}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-content-muted">Accepted: PDF, JPEG, PNG, WebP · Max 10 MB</p>
        {uploadError && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-danger-strong">
            <XCircle className="h-4 w-4 shrink-0" />
            {uploadError}
          </p>
        )}
      </Card>

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-card bg-surface-hover" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface-card py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-card bg-brand-50 text-brand-900">
            <FileText className="h-8 w-8" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-content">No documents uploaded yet</p>
            <p className="mt-1 text-sm text-content-secondary">
              Identity and financial documents improve your verification score.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {DOCUMENT_CATEGORIES.filter((cat) => groupedDocs[cat.label]).map((cat) => (
            <div key={cat.label}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-content-muted">
                {cat.label}
              </h3>
              <div className="space-y-2">
                {groupedDocs[cat.label]!.map((doc) => {
                  const status = STATUS_CONFIG[doc.verificationStatus] ?? STATUS_CONFIG.pending
                  const StatusIcon = status.icon
                  const detail = verificationDetail(doc)
                  return (
                    <div
                      key={doc.id}
                      className="flex items-start gap-4 rounded-card border border-line bg-surface-card p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-surface-inset">
                        <FileText className="h-5 w-5 text-content-muted" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-content">
                          {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                        </p>
                        <p className="text-xs text-content-muted">
                          {formatDate(doc.uploadedAt)}
                          {doc.fileSizeBytes != null && ` · ${formatBytes(doc.fileSizeBytes)}`}
                        </p>
                        {detail && (
                          <p
                            className={cn(
                              'mt-1 text-xs',
                              doc.verificationStatus === 'verified'
                                ? 'text-success-strong'
                                : doc.verificationStatus === 'rejected'
                                  ? 'text-danger-strong'
                                  : doc.verificationStatus === 'needs_review'
                                    ? 'text-warning-strong'
                                    : 'text-content-secondary'
                            )}
                          >
                            {detail}
                          </p>
                        )}
                      </div>
                      <StatusPill
                        status={status.tone}
                        label={status.label}
                        icon={<StatusIcon className={cn(doc.verificationStatus === 'pending' && 'animate-spin')} />}
                        className="shrink-0"
                      />
                      <button
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deletingId === doc.id}
                        className="ml-2 shrink-0 rounded-lg p-1.5 text-content-muted transition-colors hover:bg-danger-soft hover:text-danger-strong disabled:opacity-40"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
