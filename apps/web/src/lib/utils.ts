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
  A: 'text-[#123C35] bg-[#F0F7F5] border-[#C8D2C3]',
  B: 'text-[#3D6658] bg-[#EBF2EF] border-[#B5CEC8]',
  C: 'text-[#5F6761] bg-[#F2F5F2] border-[#C8D2C3]',
  D: 'text-[#C7A66A] bg-[#FAF7F2] border-[#E3D3B3]',
  E: 'text-[#A96E52] bg-[#F9F3EF] border-[#E5C9BB]',
}

export const TIER_RING_COLORS: Record<TrustTier, string> = {
  A: 'stroke-[#123C35]',
  B: 'stroke-[#3D6658]',
  C: 'stroke-[#8FA491]',
  D: 'stroke-[#C7A66A]',
  E: 'stroke-[#A96E52]',
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
