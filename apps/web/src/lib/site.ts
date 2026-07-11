export const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
export const isPublicSite = process.env.NEXT_PUBLIC_SITE_MODE === 'public' || !hasClerkPublishableKey
