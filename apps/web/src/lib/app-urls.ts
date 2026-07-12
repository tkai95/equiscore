const DEFAULT_CONSUMER_APP_URL = 'https://dev.equiscore.app'
const PARTNER_HOSTS = new Set(['partners.equiscore.app', 'admin.equiscore.app'])

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function consumerAppUrl(): string {
  const configured = process.env['NEXT_PUBLIC_CONSUMER_APP_URL']
  if (configured) return stripTrailingSlash(configured)

  if (typeof window !== 'undefined') {
    if (!PARTNER_HOSTS.has(window.location.hostname)) return window.location.origin
  }

  return DEFAULT_CONSUMER_APP_URL
}

export function absoluteConsumerUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${consumerAppUrl()}${path.startsWith('/') ? path : `/${path}`}`
}
