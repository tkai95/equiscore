"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreProfileCompleteness = scoreProfileCompleteness;
exports.scoreVerificationStrength = scoreVerificationStrength;
exports.scoreIdentityConfidence = scoreIdentityConfidence;
exports.scoreIncomeStability = scoreIncomeStability;
exports.scoreAffordability = scoreAffordability;
exports.scoreRentalReliability = scoreRentalReliability;
exports.scoreFinancialStability = scoreFinancialStability;
const reason_codes_1 = require("./reason-codes");
// ─── Profile Completeness ─────────────────────────────────────────────────────
function scoreProfileCompleteness(features) {
    const score = Math.min(100, Math.round(features.profileFieldsComplete * 100));
    return { score, reasonCodes: [] };
}
// ─── Verification Strength ────────────────────────────────────────────────────
function scoreVerificationStrength(features) {
    const codes = [];
    let total = 0;
    if (features.openBankingConnected) {
        total += 25;
        codes.push(reason_codes_1.REASON_CODES.OB_CONNECTED);
    }
    if (features.monthsOfBankHistory >= 6) {
        total += 10;
        codes.push(reason_codes_1.REASON_CODES.TXN_HISTORY_6M);
    }
    else if (features.monthsOfBankHistory >= 3) {
        total += 5;
        codes.push(reason_codes_1.REASON_CODES.TXN_HISTORY_3M);
    }
    if (features.accountHolderNameMatch) {
        total += 15;
        codes.push(reason_codes_1.REASON_CODES.NAME_MATCH);
    }
    if (features.hasUploadedDocuments) {
        total += 10;
        codes.push(reason_codes_1.REASON_CODES.DOCUMENT_UPLOADED);
    }
    if (features.addressMatchConfidence > 0.7) {
        total += 10;
        codes.push(reason_codes_1.REASON_CODES.ADDRESS_VERIFIED);
    }
    if (features.connectedAccountsCount >= 1) {
        total += 5;
    }
    // Cap self-declared only profiles
    if (features.selfDeclaredOnly) {
        total = Math.min(total, 35);
        codes.push(reason_codes_1.REASON_CODES.SELF_DECLARED_ONLY);
    }
    return { score: Math.min(100, total), reasonCodes: codes };
}
// ─── Identity Confidence ──────────────────────────────────────────────────────
function scoreIdentityConfidence(features) {
    const codes = [];
    let total = 0;
    if (features.documentCount > 0) {
        total += 25;
        codes.push(reason_codes_1.REASON_CODES.IDENTITY_DOCUMENT);
    }
    if (features.addressMatchConfidence > 0.8) {
        total += 20;
        codes.push(reason_codes_1.REASON_CODES.ADDRESS_CONSISTENT);
    }
    else if (features.addressMatchConfidence > 0.5) {
        total += 10;
    }
    if (features.accountHolderNameMatch) {
        total += 30;
        codes.push(reason_codes_1.REASON_CODES.PROFILE_CONSISTENT);
    }
    else if (features.openBankingConnected && !features.accountHolderNameMatch) {
        total -= 20;
        codes.push(reason_codes_1.REASON_CODES.NAME_MISMATCH);
    }
    if (features.verifiedSourcesCount >= 2) {
        total += 20;
        codes.push(reason_codes_1.REASON_CODES.ADDRESS_CONSISTENT);
    }
    return { score: Math.max(0, Math.min(100, total)), reasonCodes: codes };
}
// ─── Income Stability ─────────────────────────────────────────────────────────
function scoreIncomeStability(features) {
    const codes = [];
    let total = 0;
    if (features.recurringSalaryDetected) {
        total += 30;
        codes.push(reason_codes_1.REASON_CODES.SALARY_RECURRING);
    }
    // Gig income consistency (variance < 0.3 = fairly consistent)
    if (!features.recurringSalaryDetected && features.averageMonthlyIncome > 0 && features.incomeVolatility < 0.5) {
        total += 20;
        codes.push(reason_codes_1.REASON_CODES.GIG_INCOME_CONSISTENT);
    }
    if (features.incomeVolatility < 0.2) {
        total += 20;
        codes.push(reason_codes_1.REASON_CODES.LOW_INCOME_VARIANCE);
    }
    else if (features.incomeVolatility > 0.5) {
        total -= 10;
        codes.push(reason_codes_1.REASON_CODES.HIGH_INCOME_VARIANCE);
    }
    if (features.averageMonthlyIncome > 0 && features.monthsOfBankHistory >= 3) {
        total += 15;
        codes.push(reason_codes_1.REASON_CODES.NET_INFLOW_POSITIVE);
    }
    if (features.averageMonthlyIncome === 0 && !features.recurringSalaryDetected) {
        codes.push(reason_codes_1.REASON_CODES.NO_RECURRING_INCOME);
    }
    // Up to +5 for multiple income sources
    if (features.verifiedSourcesCount > 1) {
        total += 5;
    }
    return { score: Math.max(0, Math.min(100, total)), reasonCodes: codes };
}
// ─── Affordability ────────────────────────────────────────────────────────────
function scoreAffordability(features) {
    const codes = [];
    let total = 0;
    // Rent-to-income ratio (healthy = < 40%)
    if (features.rentToIncomeRatio > 0 && features.rentToIncomeRatio < 0.4) {
        total += 25;
        codes.push(reason_codes_1.REASON_CODES.RENT_INCOME_HEALTHY);
    }
    else if (features.rentToIncomeRatio >= 0.4 && features.rentToIncomeRatio < 0.6) {
        total += 10;
    }
    else if (features.rentToIncomeRatio >= 0.6) {
        total -= 15;
        codes.push(reason_codes_1.REASON_CODES.HIGH_RENT_RATIO);
    }
    if (features.averageEndMonthBalance > 0) {
        total += 25;
        codes.push(reason_codes_1.REASON_CODES.RESIDUAL_BALANCE_HEALTHY);
    }
    if (features.savingsMonthsBuffer >= 2) {
        total += 20;
        codes.push(reason_codes_1.REASON_CODES.SAVINGS_BUFFER);
    }
    if (features.overdraftDependency < 0.1) {
        total += 15;
        codes.push(reason_codes_1.REASON_CODES.LOW_OVERDRAFT);
    }
    else if (features.overdraftDependency > 0.3) {
        total -= 15;
        codes.push(reason_codes_1.REASON_CODES.OVERDRAFT_DEPENDENT);
    }
    if (features.missedPaymentIndicators === 0) {
        total += 15;
        codes.push(reason_codes_1.REASON_CODES.NO_RETURNED_PAYMENTS);
    }
    return { score: Math.max(0, Math.min(100, total)), reasonCodes: codes };
}
// ─── Rental Reliability ───────────────────────────────────────────────────────
function scoreRentalReliability(features) {
    const codes = [];
    let total = 0;
    if (features.recurringRentDetected) {
        total += 25;
        codes.push(reason_codes_1.REASON_CODES.RENT_RECURRING);
        // These bonuses only apply if rent is detected
        total += 20;
        codes.push(reason_codes_1.REASON_CODES.RENT_AMOUNT_CONSISTENT);
        total += 20;
        codes.push(reason_codes_1.REASON_CODES.RENT_TIMING_CONSISTENT);
    }
    else {
        codes.push(reason_codes_1.REASON_CODES.NO_RENT_EVIDENCE);
    }
    if (features.monthsOfBankHistory >= 6 && features.recurringRentDetected) {
        total += 20;
        codes.push(reason_codes_1.REASON_CODES.RENT_HISTORY_6M);
    }
    if (features.documentCount > 0 && features.hasUploadedDocuments) {
        total += 15;
        codes.push(reason_codes_1.REASON_CODES.TENANCY_DOCUMENT);
    }
    return { score: Math.max(0, Math.min(100, total)), reasonCodes: codes };
}
// ─── Financial Stability ──────────────────────────────────────────────────────
function scoreFinancialStability(features) {
    const codes = [];
    let total = 0;
    if (features.savingsMonthsBuffer > 0) {
        total += 25;
        codes.push(reason_codes_1.REASON_CODES.SAVINGS_TREND_UP);
    }
    if (features.monthsOfBankHistory >= 6 && features.averageMonthlyIncome > 0) {
        total += 25;
        codes.push(reason_codes_1.REASON_CODES.INCOME_CONTINUITY);
    }
    if (features.incomeVolatility < 0.25) {
        total += 20;
        codes.push(reason_codes_1.REASON_CODES.LOW_SPEND_VOLATILITY);
    }
    if (features.missedPaymentIndicators === 0 && features.overdraftDependency < 0.15) {
        total += 20;
        codes.push(reason_codes_1.REASON_CODES.DEBT_SERVICING_STABLE);
    }
    if (features.averageEndMonthBalance > 0 && features.savingsMonthsBuffer >= 1) {
        total += 10;
        codes.push(reason_codes_1.REASON_CODES.STRONG_CASHFLOW);
    }
    return { score: Math.max(0, Math.min(100, total)), reasonCodes: codes };
}
//# sourceMappingURL=scorecards.js.map