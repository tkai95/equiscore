import { z } from 'zod'

export const documentUploadSchema = z.object({
  documentType: z.enum([
    'passport',
    'national_id',
    'biometric_residence_permit',
    'driving_licence',
    'bank_statement',
    'payslip',
    'employment_letter',
    'tenancy_agreement',
    'utility_bill',
    'p60',
    'p45',
    'tax_return',
    'other',
  ]),
})

export type DocumentUploadData = z.infer<typeof documentUploadSchema>
