"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCORECARD_WEIGHTS = exports.TIER_THRESHOLDS = exports.TIER_LABELS = void 0;
exports.TIER_LABELS = {
    A: 'Highly verified and financially stable',
    B: 'Verified and generally reliable',
    C: 'Partially verified with moderate confidence',
    D: 'Limited evidence or inconsistent profile',
    E: 'Insufficient confidence — further review needed',
};
exports.TIER_THRESHOLDS = [
    { tier: 'A', minScore: 80 },
    { tier: 'B', minScore: 65 },
    { tier: 'C', minScore: 50 },
    { tier: 'D', minScore: 35 },
    { tier: 'E', minScore: 0 },
];
exports.SCORECARD_WEIGHTS = {
    general: {
        profileCompleteness: 10,
        verificationStrength: 20,
        identityConfidence: 15,
        incomeStability: 15,
        affordability: 20,
        rentalReliability: 10,
        financialStability: 10,
    },
    tenant: {
        profileCompleteness: 8,
        verificationStrength: 18,
        identityConfidence: 12,
        incomeStability: 15,
        affordability: 22,
        rentalReliability: 18,
        financialStability: 7,
    },
    lender_readiness: {
        profileCompleteness: 8,
        verificationStrength: 15,
        identityConfidence: 12,
        incomeStability: 22,
        affordability: 25,
        rentalReliability: 8,
        financialStability: 10,
    },
    telecom: {
        profileCompleteness: 10,
        verificationStrength: 20,
        identityConfidence: 20,
        incomeStability: 15,
        affordability: 20,
        rentalReliability: 5,
        financialStability: 10,
    },
};
//# sourceMappingURL=trust.js.map