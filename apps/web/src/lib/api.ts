const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

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
  },
  analytics: {
    summary: (token: string) => apiFetch('/analytics/summary', {}, token),
    insights: (token: string) =>
      apiFetch('/analytics/insights', { method: 'POST' }, token),
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
