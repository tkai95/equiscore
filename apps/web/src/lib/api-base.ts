const LOCAL_API_URL = 'http://localhost:4000/api/v1'
const BROWSER_API_URL = '/api/backend'

function serverApiUrl(): string {
  return (process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? LOCAL_API_URL).replace(
    /\/+$/,
    ''
  )
}

// Browser requests stay same-origin so admin.equiscore.app,
// partners.equiscore.app and dev.equiscore.app do not depend on API CORS.
// Server-rendered pages need an absolute URL because Node cannot fetch
// relative app routes such as /api/backend/public/profile/:token.
export const API_URL = typeof window === 'undefined' ? serverApiUrl() : BROWSER_API_URL
