import { z } from 'zod';
export declare const updateProfileSchema: z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    dob: z.ZodOptional<z.ZodString>;
    nationality: z.ZodOptional<z.ZodString>;
    residencyStatus: z.ZodOptional<z.ZodEnum<["british_citizen", "settled_status", "pre_settled_status", "student_visa", "work_visa", "refugee", "asylum_seeker", "other"]>>;
    employmentType: z.ZodOptional<z.ZodEnum<["employed_full_time", "employed_part_time", "self_employed", "gig_worker", "student", "graduate", "unemployed", "other"]>>;
    monthlyIncomeDeclared: z.ZodOptional<z.ZodNumber>;
    monthlyRentDeclared: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    fullName?: string | undefined;
    dob?: string | undefined;
    nationality?: string | undefined;
    residencyStatus?: "other" | "british_citizen" | "settled_status" | "pre_settled_status" | "student_visa" | "work_visa" | "refugee" | "asylum_seeker" | undefined;
    employmentType?: "other" | "employed_full_time" | "employed_part_time" | "self_employed" | "gig_worker" | "student" | "graduate" | "unemployed" | undefined;
    monthlyIncomeDeclared?: number | undefined;
    monthlyRentDeclared?: number | undefined;
}, {
    fullName?: string | undefined;
    dob?: string | undefined;
    nationality?: string | undefined;
    residencyStatus?: "other" | "british_citizen" | "settled_status" | "pre_settled_status" | "student_visa" | "work_visa" | "refugee" | "asylum_seeker" | undefined;
    employmentType?: "other" | "employed_full_time" | "employed_part_time" | "self_employed" | "gig_worker" | "student" | "graduate" | "unemployed" | undefined;
    monthlyIncomeDeclared?: number | undefined;
    monthlyRentDeclared?: number | undefined;
}>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
//# sourceMappingURL=profile.d.ts.map