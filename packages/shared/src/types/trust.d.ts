export type TrustTier = 'A' | 'B' | 'C' | 'D' | 'E';
export type ScorecardType = 'general' | 'tenant' | 'lender_readiness' | 'telecom';
export type FraudRisk = 'pass' | 'review' | 'high_risk';
export type IdentityConfidence = 'low' | 'medium' | 'high';
export interface TrustSubScores {
    profileCompleteness: number;
    verificationStrength: number;
    identityConfidence: number;
    incomeStability: number;
    affordability: number;
    rentalReliability: number;
    financialStability: number;
}
export interface ReasonCode {
    code: string;
    dimension: keyof TrustSubScores;
    sentiment: 'positive' | 'negative' | 'neutral';
    message: string;
    weight: number;
}
export interface TrustScore {
    id: string;
    userId: string;
    scorecardType: ScorecardType;
    scoreVersion: string;
    subScores: TrustSubScores;
    overallScore: number;
    overallTier: TrustTier;
    fraudRisk: FraudRisk;
    reasonCodes: ReasonCode[];
    computedAt: string;
}
export interface TrustFeatures {
    monthsOfBankHistory: number;
    connectedAccountsCount: number;
    averageMonthlyIncome: number;
    incomeVolatility: number;
    recurringSalaryDetected: boolean;
    recurringRentDetected: boolean;
    averageEndMonthBalance: number;
    savingsMonthsBuffer: number;
    rentToIncomeRatio: number;
    overdraftDependency: number;
    missedPaymentIndicators: number;
    accountHolderNameMatch: boolean;
    addressMatchConfidence: number;
    documentCount: number;
    verifiedSourcesCount: number;
    profileFieldsComplete: number;
    selfDeclaredOnly: boolean;
    openBankingConnected: boolean;
    hasUploadedDocuments: boolean;
}
export declare const TIER_LABELS: Record<TrustTier, string>;
export declare const TIER_THRESHOLDS: Array<{
    tier: TrustTier;
    minScore: number;
}>;
export declare const SCORECARD_WEIGHTS: Record<ScorecardType, TrustSubScores>;
//# sourceMappingURL=trust.d.ts.map