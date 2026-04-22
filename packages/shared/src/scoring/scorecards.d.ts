import type { TrustFeatures } from '../types/trust';
import type { ReasonCode } from '../types/trust';
export interface ScorecardResult {
    score: number;
    reasonCodes: ReasonCode[];
}
export declare function scoreProfileCompleteness(features: TrustFeatures): ScorecardResult;
export declare function scoreVerificationStrength(features: TrustFeatures): ScorecardResult;
export declare function scoreIdentityConfidence(features: TrustFeatures): ScorecardResult;
export declare function scoreIncomeStability(features: TrustFeatures): ScorecardResult;
export declare function scoreAffordability(features: TrustFeatures): ScorecardResult;
export declare function scoreRentalReliability(features: TrustFeatures): ScorecardResult;
export declare function scoreFinancialStability(features: TrustFeatures): ScorecardResult;
//# sourceMappingURL=scorecards.d.ts.map