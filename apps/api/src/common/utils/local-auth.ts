import type { ConfigService } from '@nestjs/config'

// Local auth bypass (APP_ENV=local). See docs/ARCHITECTURE.md §4.
// LOCAL_AUTH_TOKEN must match apps/web/src/lib/local-auth/clerk-stub.tsx.
export const LOCAL_AUTH_TOKEN = 'local-auth-bypass'
export const LOCAL_AUTH_USER = { clerkId: 'local_dev_user', email: 'local@equiscore.test' }

const LOOPBACK_DB_HOSTS = ['localhost', '127.0.0.1', '[::1]']
const LOOPBACK_CLIENTS = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

function hasLoopbackDatabase(databaseUrl: string): boolean {
  try {
    return LOOPBACK_DB_HOSTS.includes(new URL(databaseUrl).hostname)
  } catch {
    return false
  }
}

/**
 * Is the bypass on? Throws (stopping the API from booting) if APP_ENV=local is
 * set anywhere that is not clearly a developer machine, so a stray env var can
 * never silently open a deployed API or a real database.
 */
export function isLocalAuthEnabled(config: ConfigService): boolean {
  if (config.get<string>('APP_ENV') !== 'local') return false

  if (config.get<string>('NODE_ENV') !== 'development') {
    throw new Error('APP_ENV=local requires NODE_ENV=development')
  }

  if (! hasLoopbackDatabase(config.get<string>('DATABASE_URL') ?? '')) {
    throw new Error('APP_ENV=local requires a DATABASE_URL on localhost')
  }

  return true
}

export function isLoopbackClient(remoteAddress: string | undefined): boolean {
  return remoteAddress !== undefined && LOOPBACK_CLIENTS.includes(remoteAddress)
}
