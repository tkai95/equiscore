import { z } from 'zod'

export const step1Schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  nationality: z.string().min(2, 'Please enter your nationality'),
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
  ukMoveDate: z.string().optional(),
  addressLine1: z.string().min(3, 'Please enter your address'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'Please enter your city'),
  postcode: z
    .string()
    .regex(
      /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i,
      'Please enter a valid UK postcode'
    ),
})

export const step3Schema = z.object({
  employmentType: z.enum([
    'employed_full_time',
    'employed_part_time',
    'self_employed',
    'gig_worker',
    'student',
    'graduate',
    'unemployed',
    'other',
  ]),
  employerName: z.string().optional(),
  jobTitle: z.string().optional(),
  monthlyIncomeDeclared: z
    .number()
    .min(0, 'Income must be 0 or more')
    .max(500_000)
    .optional(),
  payFrequency: z.enum(['weekly', 'fortnightly', 'monthly', 'irregular']).optional(),
})

export const step4Schema = z.object({
  monthlyRentDeclared: z
    .number()
    .min(0, 'Rent must be 0 or more')
    .max(50_000)
    .optional(),
  landlordName: z.string().optional(),
  tenancyStartDate: z.string().optional(),
  reasonForUsingEquiscore: z
    .enum([
      'rental_application',
      'financial_product',
      'employment_check',
      'identity_verification',
      'other',
    ])
    .optional(),
})

export type Step1Data = z.infer<typeof step1Schema>
export type Step2Data = z.infer<typeof step2Schema>
export type Step3Data = z.infer<typeof step3Schema>
export type Step4Data = z.infer<typeof step4Schema>

export type OnboardingData = Step1Data & Step2Data & Step3Data & Step4Data
