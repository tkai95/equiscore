import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TrustTier } from '@equiscore/shared'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(date))
}

export const TIER_COLORS: Record<TrustTier, string> = {
  A: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  B: 'text-blue-600 bg-blue-50 border-blue-200',
  C: 'text-amber-600 bg-amber-50 border-amber-200',
  D: 'text-orange-600 bg-orange-50 border-orange-200',
  E: 'text-red-600 bg-red-50 border-red-200',
}

export const TIER_RING_COLORS: Record<TrustTier, string> = {
  A: 'stroke-emerald-500',
  B: 'stroke-blue-500',
  C: 'stroke-amber-500',
  D: 'stroke-orange-500',
  E: 'stroke-red-500',
}

export const DIMENSION_LABELS: Record<string, string> = {
  profileCompleteness: 'Profile Completeness',
  verificationStrength: 'Verification Strength',
  identityConfidence: 'Identity Confidence',
  incomeStability: 'Income Stability',
  affordability: 'Affordability',
  rentalReliability: 'Rental Reliability',
  financialStability: 'Financial Stability',
}

export const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  profileCompleteness: 'How complete your profile information is',
  verificationStrength: 'How much of your profile is backed by verified sources',
  identityConfidence: 'Consistency of your identity across all data sources',
  incomeStability: 'Regularity and predictability of your income',
  affordability: 'Your ability to comfortably meet financial obligations',
  rentalReliability: 'Evidence of consistent rent payment behaviour',
  financialStability: 'Overall steadiness of your financial position',
}
