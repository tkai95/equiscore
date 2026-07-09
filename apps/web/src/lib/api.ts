const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

export type ImportJobStatus = 'processing' | 'completed' | 'failed' | 'cancelled'

export interface StatementImportResult {
  connectionId: string
  imported: number
  skipped: number
  coverageStart: string
  coverageEnd: string
  ledgerVerified: boolean
  warnings: string[]
  overallScore: number
  overallTier: string
}

export interface TxnRow {
  date: string
  description: string
  amount: number
}
export interface CategoryBreakdown {
  kind: 'category'
  key: string
  label: string
  total: number
  monthlyAverage: number
  transactionCount: number
  merchants: Array<{ name: string; total: number; count: number }>
  transactions: TxnRow[]
}
export interface CommitmentBreakdown {
  kind: 'commitment'
  key: string
  total: number
  count: number
  typicalAmount: number
  transactions: TxnRow[]
}
export interface IncomeBreakdown {
  kind: 'income'
  key: string
  total: number
  count: number
  typicalAmount: number
  transactions: TxnRow[]
}
export interface MonthBreakdown {
  kind: 'month'
  month: string
  income: number
  spend: number
  net: number
  categories: Array<{ label: string; total: number }>
  largest: TxnRow[]
}
export type Breakdown = CategoryBreakdown | CommitmentBreakdown | IncomeBreakdown | MonthBreakdown

export interface ImportJob {
  id: string
  status: ImportJobStatus
  sourceType: string
  fileName: string | null
  result: StatementImportResult | null
  error: string | null
  createdAt: string
  completedAt: string | null
}

async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((error as { message: string }).message ?? 'API error')
  }

  return res.json() as Promise<T>
}

export const api = {
  auth: {
    sync: (token: string) => apiFetch('/auth/sync', { method: 'POST' }, token),
    me: (token: string) => apiFetch('/auth/me', {}, token),
  },
  profile: {
    get: (token: string) => apiFetch('/profile', {}, token),
    update: (token: string, data: unknown) =>
      apiFetch('/profile', { method: 'PATCH', body: JSON.stringify(data) }, token),
    completeOnboarding: (token: string, data: unknown) =>
      apiFetch('/profile/onboarding', { method: 'PUT', body: JSON.stringify(data) }, token),
    getAddresses: (token: string) => apiFetch('/profile/addresses', {}, token),
    getEmployment: (token: string) => apiFetch('/profile/employment', {}, token),
    getRental: (token: string) => apiFetch('/profile/rental', {}, token),
  },
  banking: {
    getLinkUrl: (token: string) =>
      apiFetch<{ url: string }>('/open-banking/link-token', { method: 'POST' }, token),
    getAccounts: (token: string) => apiFetch('/open-banking/accounts', {}, token),
    getAccountTransactions: (token: string, accountId: string) =>
      apiFetch(`/open-banking/accounts/${accountId}/transactions`, {}, token),
    sync: (token: string) =>
      apiFetch<{ synced: number }>('/open-banking/sync', { method: 'POST' }, token),
    disconnect: (token: string, connectionId: string) =>
      apiFetch<{ disconnected: boolean; consentRevoked: boolean; accountsRemoved: number }>(
        `/open-banking/connections/${connectionId}`,
        { method: 'DELETE' },
        token
      ),
  },
  documents: {
    list: (token: string) => apiFetch('/documents', {}, token),
    getUploadUrl: (token: string, documentType: string, mimeType: string) =>
      apiFetch<{ uploadUrl: string; fields: Record<string, string>; key: string }>(
        '/documents/upload-url',
        { method: 'POST', body: JSON.stringify({ documentType, mimeType }) },
        token
      ),
    confirmUpload: (token: string, data: unknown) =>
      apiFetch('/documents/confirm', { method: 'POST', body: JSON.stringify(data) }, token),
    delete: (token: string, id: string) =>
      apiFetch(`/documents/${id}`, { method: 'DELETE' }, token),
  },
  scores: {
    recompute: (token: string, type = 'general') =>
      apiFetch(`/scores/recompute?type=${type}`, { method: 'POST' }, token),
    latest: (token: string, type = 'general') =>
      apiFetch(`/scores/latest?type=${type}`, {}, token),
    history: (token: string) => apiFetch('/scores/history', {}, token),
    impactPreview: (
      token: string,
      exclude: { excludeConnectionIds?: string[]; excludeDocumentIds?: string[] }
    ) =>
      apiFetch<{
        current: { overallScore: number; overallTier: string; status: string }
        projected: { overallScore: number; overallTier: string; status: string }
        delta: number
      }>('/scores/impact-preview', { method: 'POST', body: JSON.stringify(exclude) }, token),
  },
  analytics: {
    summary: (token: string) => apiFetch('/analytics/summary', {}, token),
    insights: (token: string) =>
      apiFetch('/analytics/insights', { method: 'POST' }, token),
  },
  insights: {
    getProfile: (token: string) => apiFetch('/insights/profile', {}, token),
    getBreakdown: (token: string, type: 'category' | 'commitment' | 'income' | 'month', key: string) =>
      apiFetch<Breakdown>(
        `/insights/breakdown?type=${type}&key=${encodeURIComponent(key)}`,
        {},
        token
      ),
    answerQuestion: (token: string, questionId: string, answer: string) =>
      apiFetch<{ ok: boolean; overallScore: number; overallTier: string }>(
        '/insights/questions/answer',
        { method: 'POST', body: JSON.stringify({ questionId, answer }) },
        token
      ),
    // Starts an async import; returns a job to poll (PDF reads take 30–90s).
    importPdf: async (token: string, file: File) => {
      const form = new FormData()
      form.append('file', file)
      // Multipart: let the browser set the boundary Content-Type; only send auth.
      const res = await fetch(`${API_URL}/insights/import-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!res.ok) {
        const error = (await res.json().catch(() => ({ message: res.statusText }))) as {
          message?: string
        }
        throw new Error(error.message ?? 'Upload failed')
      }
      return res.json() as Promise<{ jobId: string; status: ImportJobStatus }>
    },
    listImportJobs: (token: string) =>
      apiFetch<ImportJob[]>('/insights/import-jobs', {}, token),
    getImportJob: (token: string, id: string) =>
      apiFetch<ImportJob>(`/insights/import-jobs/${id}`, {}, token),
    cancelImportJob: (token: string, id: string) =>
      apiFetch<ImportJob>(`/insights/import-jobs/${id}/cancel`, { method: 'POST' }, token),
    importCsv: (token: string, csv: string) =>
      apiFetch<StatementImportResult>(
        '/insights/import-csv',
        { method: 'POST', body: JSON.stringify({ csv }) },
        token
      ),
  },
  sharing: {
    create: (token: string, data: unknown) =>
      apiFetch('/share-links', { method: 'POST', body: JSON.stringify(data) }, token),
    list: (token: string) => apiFetch('/share-links', {}, token),
    revoke: (token: string, id: string) =>
      apiFetch(`/share-links/${id}`, { method: 'DELETE' }, token),
    getPublic: (shareToken: string) => apiFetch(`/public/profile/${shareToken}`),
  },
}
