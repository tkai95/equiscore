import { z } from 'zod';
export declare const documentUploadSchema: z.ZodObject<{
    documentType: z.ZodEnum<["passport", "national_id", "biometric_residence_permit", "driving_licence", "bank_statement", "payslip", "employment_letter", "tenancy_agreement", "utility_bill", "p60", "p45", "tax_return", "other"]>;
}, "strip", z.ZodTypeAny, {
    documentType: "other" | "passport" | "national_id" | "biometric_residence_permit" | "driving_licence" | "bank_statement" | "payslip" | "employment_letter" | "tenancy_agreement" | "utility_bill" | "p60" | "p45" | "tax_return";
}, {
    documentType: "other" | "passport" | "national_id" | "biometric_residence_permit" | "driving_licence" | "bank_statement" | "payslip" | "employment_letter" | "tenancy_agreement" | "utility_bill" | "p60" | "p45" | "tax_return";
}>;
export type DocumentUploadData = z.infer<typeof documentUploadSchema>;
//# sourceMappingURL=documents.d.ts.map