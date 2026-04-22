export type DocumentType = 'passport' | 'national_id' | 'biometric_residence_permit' | 'driving_licence' | 'bank_statement' | 'payslip' | 'employment_letter' | 'tenancy_agreement' | 'utility_bill' | 'p60' | 'p45' | 'tax_return' | 'other';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'needs_review';
export interface UploadedDocument {
    id: string;
    userId: string;
    documentType: DocumentType;
    fileUrl: string;
    verificationStatus: VerificationStatus;
    extractedMetadata?: Record<string, unknown>;
    uploadedAt: string;
}
export declare const DOCUMENT_TYPE_LABELS: Record<DocumentType, string>;
export declare const DOCUMENT_VERIFICATION_WEIGHTS: Record<DocumentType, number>;
//# sourceMappingURL=documents.d.ts.map