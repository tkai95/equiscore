'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { api } from '@/lib/api'
import { FileText, Upload, Trash2, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

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

const DOCUMENT_CATEGORIES = [
  {
    label: 'Identity',
    types: ['passport', 'national_id', 'biometric_residence_permit', 'driving_licence'],
  },
  {
    label: 'Financial',
    types: ['bank_statement', 'payslip', 'employment_letter', 'p60', 'p45', 'tax_return'],
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

interface UploadedDocument {
  id: string
  documentType: string
  fileUrl: string
  mimeType: string
  fileSizeBytes: number | null
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'requires_review'
  uploadedAt: string
}

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Pending review', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  verified: { icon: CheckCircle, label: 'Verified', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { icon: XCircle, label: 'Rejected', className: 'bg-red-50 text-red-700 ring-red-200' },
  requires_review: { icon: AlertCircle, label: 'Requires review', className: 'bg-cream text-charcoal-mid ring-[#D8D6C9]' },
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
  })

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

      const { uploadUrl, fields, key } = await api.documents.getUploadUrl(token!, selectedType, file.type)

      const formData = new FormData()
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v))
      formData.append('file', file)

      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('File upload to storage failed.')

      await api.documents.confirmUpload(token!, {
        documentType: selectedType,
        fileKey: key,
        mimeType: file.type,
        fileSizeBytes: file.size,
      })

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
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-600">Upload supporting documents to strengthen your trust profile.</p>
      </div>

      {/* Upload panel */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-4 font-semibold text-gray-900">Upload a document</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Document type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedType || isUploading}
              className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-cream-surface shadow-sm hover:bg-brand-dark disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? 'Uploading…' : 'Choose file'}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">Accepted: PDF, JPEG, PNG, WebP · Max 10 MB</p>
        {uploadError && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
            <XCircle className="h-4 w-4 shrink-0" />
            {uploadError}
          </p>
        )}
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white py-16 shadow-sm ring-1 ring-gray-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream">
            <FileText className="h-8 w-8 text-brand" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">No documents uploaded yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Identity and financial documents improve your verification score.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {DOCUMENT_CATEGORIES.filter((cat) => groupedDocs[cat.label]).map((cat) => (
            <div key={cat.label}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                {cat.label}
              </h3>
              <div className="space-y-2">
                {groupedDocs[cat.label]!.map((doc) => {
                  const status = STATUS_CONFIG[doc.verificationStatus] ?? STATUS_CONFIG.pending
                  const StatusIcon = status.icon
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50">
                        <FileText className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(doc.uploadedAt)}
                          {doc.fileSizeBytes != null && ` · ${formatBytes(doc.fileSizeBytes)}`}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1',
                          status.className
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      <button
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deletingId === doc.id}
                        className="ml-2 shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
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
