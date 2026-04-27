import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/onboarding/', '/sign-in/', '/sign-up/', '/api/'],
    },
    sitemap: 'https://equiscore.app/sitemap.xml',
  }
}
