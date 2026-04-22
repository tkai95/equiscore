import { z } from 'zod';
export declare const step1Schema: z.ZodObject<{
    fullName: z.ZodString;
    dob: z.ZodString;
    nationality: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    dob: string;
    nationality: string;
}, {
    fullName: string;
    dob: string;
    nationality: string;
}>;
export declare const step2Schema: z.ZodObject<{
    residencyStatus: z.ZodEnum<["british_citizen", "settled_status", "pre_settled_status", "student_visa", "work_visa", "refugee", "asylum_seeker", "other"]>;
    ukMoveDate: z.ZodOptional<z.ZodString>;
    addressLine1: z.ZodString;
    addressLine2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    postcode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    residencyStatus: "other" | "british_citizen" | "settled_status" | "pre_settled_status" | "student_visa" | "work_visa" | "refugee" | "asylum_seeker";
    addressLine1: string;
    city: string;
    postcode: string;
    ukMoveDate?: string | undefined;
    addressLine2?: string | undefined;
}, {
    residencyStatus: "other" | "british_citizen" | "settled_status" | "pre_settled_status" | "student_visa" | "work_visa" | "refugee" | "asylum_seeker";
    addressLine1: string;
    city: string;
    postcode: string;
    ukMoveDate?: string | undefined;
    addressLine2?: string | undefined;
}>;
export declare const step3Schema: z.ZodObject<{
    employmentType: z.ZodEnum<["employed_full_time", "employed_part_time", "self_employed", "gig_worker", "student", "graduate", "unemployed", "other"]>;
    employerName: z.ZodOptional<z.ZodString>;
    jobTitle: z.ZodOptional<z.ZodString>;
    monthlyIncomeDeclared: z.ZodOptional<z.ZodNumber>;
    payFrequency: z.ZodOptional<z.ZodEnum<["weekly", "fortnightly", "monthly", "irregular"]>>;
}, "strip", z.ZodTypeAny, {
    employmentType: "other" | "employed_full_time" | "employed_part_time" | "self_employed" | "gig_worker" | "student" | "graduate" | "unemployed";
    monthlyIncomeDeclared?: number | undefined;
    employerName?: string | undefined;
    jobTitle?: string | undefined;
    payFrequency?: "weekly" | "fortnightly" | "monthly" | "irregular" | undefined;
}, {
    employmentType: "other" | "employed_full_time" | "employed_part_time" | "self_employed" | "gig_worker" | "student" | "graduate" | "unemployed";
    monthlyIncomeDeclared?: number | undefined;
    employerName?: string | undefined;
    jobTitle?: string | undefined;
    payFrequency?: "weekly" | "fortnightly" | "monthly" | "irregular" | undefined;
}>;
export declare const step4Schema: z.ZodObject<{
    monthlyRentDeclared: z.ZodOptional<z.ZodNumber>;
    landlordName: z.ZodOptional<z.ZodString>;
    tenancyStartDate: z.ZodOptional<z.ZodString>;
    reasonForUsingEquiscore: z.ZodOptional<z.ZodEnum<["rental_application", "financial_product", "employment_check", "identity_verification", "other"]>>;
}, "strip", z.ZodTypeAny, {
    monthlyRentDeclared?: number | undefined;
    landlordName?: string | undefined;
    tenancyStartDate?: string | undefined;
    reasonForUsingEquiscore?: "other" | "rental_application" | "financial_product" | "employment_check" | "identity_verification" | undefined;
}, {
    monthlyRentDeclared?: number | undefined;
    landlordName?: string | undefined;
    tenancyStartDate?: string | undefined;
    reasonForUsingEquiscore?: "other" | "rental_application" | "financial_product" | "employment_check" | "identity_verification" | undefined;
}>;
export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type OnboardingData = Step1Data & Step2Data & Step3Data & Step4Data;
//# sourceMappingURL=onboarding.d.ts.map