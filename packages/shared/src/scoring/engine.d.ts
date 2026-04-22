import type { TrustFeatures, TrustScore, ScorecardType } from '../types/trust';
export declare const SCORE_VERSION = "1.0.0";
export interface ScoringInput {
    userId: string;
    scorecardType: ScorecardType;
    features: TrustFeatures;
}
export declare function computeTrustScore(input: ScoringInput): Omit<TrustScore, 'id'>;
//# sourceMappingURL=engine.d.ts.map