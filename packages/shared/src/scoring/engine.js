"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCORE_VERSION = void 0;
exports.computeTrustScore = computeTrustScore;
const trust_1 = require("../types/trust");
const scorecards_1 = require("./scorecards");
exports.SCORE_VERSION = '1.0.0';
function computeTrustScore(input) {
    const { userId, scorecardType, features } = input;
    const weights = trust_1.SCORECARD_WEIGHTS[scorecardType];
    const completeness = (0, scorecards_1.scoreProfileCompleteness)(features);
    const verification = (0, scorecards_1.scoreVerificationStrength)(features);
    const identity = (0, scorecards_1.scoreIdentityConfidence)(features);
    const income = (0, scorecards_1.scoreIncomeStability)(features);
    const affordability = (0, scorecards_1.scoreAffordability)(features);
    const rental = (0, scorecards_1.scoreRentalReliability)(features);
    const financial = (0, scorecards_1.scoreFinancialStability)(features);
    const subScores = {
        profileCompleteness: completeness.score,
        verificationStrength: verification.score,
        identityConfidence: identity.score,
        incomeStability: income.score,
        affordability: affordability.score,
        rentalReliability: rental.score,
        financialStability: financial.score,
    };
    const overallScore = Math.round(Object.entries(subScores).reduce((acc, [key, value]) => {
        const weight = weights[key] / 100;
        return acc + value * weight;
    }, 0));
    const overallTier = deriveTier(overallScore);
    const allReasonCodes = [
        ...completeness.reasonCodes,
        ...verification.reasonCodes,
        ...identity.reasonCodes,
        ...income.reasonCodes,
        ...affordability.reasonCodes,
        ...rental.reasonCodes,
        ...financial.reasonCodes,
    ];
    // Deduplicate reason codes by code string
    const seen = new Set();
    const reasonCodes = allReasonCodes.filter((rc) => {
        if (seen.has(rc.code))
            return false;
        seen.add(rc.code);
        return true;
    });
    const fraudRisk = deriveFraudRisk(features);
    return {
        userId,
        scorecardType,
        scoreVersion: exports.SCORE_VERSION,
        subScores,
        overallScore,
        overallTier,
        fraudRisk,
        reasonCodes,
        computedAt: new Date().toISOString(),
    };
}
function deriveTier(score) {
    for (const { tier, minScore } of trust_1.TIER_THRESHOLDS) {
        if (score >= minScore)
            return tier;
    }
    return 'E';
}
function deriveFraudRisk(features) {
    let riskScore = 0;
    if (!features.accountHolderNameMatch && features.openBankingConnected) {
        riskScore += 30;
    }
    if (features.selfDeclaredOnly && features.profileFieldsComplete > 0.9) {
        riskScore += 10;
    }
    if (features.documentCount === 0 && features.openBankingConnected === false) {
        riskScore += 10;
    }
    if (features.incomeVolatility > 0.8 && features.averageMonthlyIncome > 0) {
        riskScore += 10;
    }
    if (riskScore >= 30)
        return 'high_risk';
    if (riskScore >= 10)
        return 'review';
    return 'pass';
}
//# sourceMappingURL=engine.js.map