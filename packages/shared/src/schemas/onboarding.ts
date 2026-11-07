import { z } from 'zod'

const emptyToUndefined = (value: unknown) =>
  value === '' || (typeof value === 'number' && Number.isNaN(value)) ? undefined : value

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const EARLIEST_YEAR = 1900
// Largest UTC offset (UTC+14), so "this month" is never rejected for someone
// whose new month has started before the server's has.
const MAX_UTC_OFFSET_MS = 14 * 60 * 60 * 1000

const isFutureMonth = (value: string) =>
  value > new Date(Date.now() + MAX_UTC_OFFSET_MS).toISOString().slice(0, 7)

/** A real `YYYY-MM` month that isn't in the future. Shared by the form and API. */
export const isValidPastMonth = (value: string) =>
  MONTH_PATTERN.test(value) && Number(value.slice(0, 4)) >= EARLIEST_YEAR && !isFutureMonth(value)

const optionalPastMonth = z
  .string()
  .refine((value) => value === '' || MONTH_PATTERN.test(value), 'Please select a month and a year')
  .refine((value) => value === '' || !isFutureMonth(value), 'This date cannot be in the future')
  .refine(
    (value) => value === '' || Number(value.slice(0, 4)) >= EARLIEST_YEAR,
    'Please select a valid year'
  )
  .optional()

export const step1Schema = z.object({
  firstName: z.string().min(1, 'Please enter your first name').max(80),
  lastName: z.string().min(1, 'Please enter your last name').max(80),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
})

export const step2Schema = z.object({
  residencyStatus: z.enum([
    'british_citizen',
    'settled_status',
    'pre_settled_status',
    'student_visa',
    'work_visa',
    'refugee',
    'asylum_seeker',
    'other',
  ]),
  ukMoveDate: optionalPastMonth,
  addressLine1: z.string().min(3, 'Please enter your address'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'Please enter your city'),
  postcode: z
    .string()
    .regex(/^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i, 'Please enter a valid UK postcode'),
})

export const step3Schema = z.object({
  employmentType: z.preprocess(
    emptyToUndefined,
    z
      .enum([
        'employed_full_time',
        'employed_part_time',
        'self_employed',
        'gig_worker',
        'student',
        'graduate',
        'unemployed',
        'other',
      ])
      .optional()
  ),
  employerName: z.string().optional(),
  jobTitle: z.string().optional(),
  monthlyIncomeDeclared: z.preprocess(
    emptyToUndefined,
    z.number().min(0, 'Income must be 0 or more').max(500_000).optional()
  ),
  payFrequency: z.preprocess(
    emptyToUndefined,
    z.enum(['weekly', 'fortnightly', 'monthly', 'irregular']).optional()
  ),
})

export const step4Schema = z.object({
  monthlyRentDeclared: z.preprocess(
    emptyToUndefined,
    z.number().min(0, 'Rent must be 0 or more').max(50_000).optional()
  ),
  landlordName: z.string().optional(),
  tenancyStartDate: optionalPastMonth,
  reasonForUsingEquiscore: z.preprocess(
    emptyToUndefined,
    z
      .enum([
        'rental_application',
        'financial_product',
        'employment_check',
        'identity_verification',
        'other',
      ])
      .optional()
  ),
})

export type Step1Data = z.infer<typeof step1Schema>
export type Step2Data = z.infer<typeof step2Schema>
export type Step3Data = z.infer<typeof step3Schema>
export type Step4Data = z.infer<typeof step4Schema>

export type OnboardingData = Step1Data & Step2Data & Step3Data & Step4Data
