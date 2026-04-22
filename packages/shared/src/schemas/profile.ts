import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  dob: z.string().optional(),
  nationality: z.string().min(2).optional(),
  residencyStatus: z
    .enum([
      'british_citizen',
      'settled_status',
      'pre_settled_status',
      'student_visa',
      'work_visa',
      'refugee',
      'asylum_seeker',
      'other',
    ])
    .optional(),
  employmentType: z
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
    .optional(),
  monthlyIncomeDeclared: z.number().min(0).max(500_000).optional(),
  monthlyRentDeclared: z.number().min(0).max(50_000).optional(),
})

export type UpdateProfileData = z.infer<typeof updateProfileSchema>
