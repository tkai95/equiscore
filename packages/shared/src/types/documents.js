"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_VERIFICATION_WEIGHTS = exports.DOCUMENT_TYPE_LABELS = void 0;
exports.DOCUMENT_TYPE_LABELS = {
    passport: 'Passport',
    national_id: 'National ID Card',
    biometric_residence_permit: 'Biometric Residence Permit',
    driving_licence: 'Driving Licence',
    bank_statement: 'Bank Statement',
    payslip: 'Payslip',
    employment_letter: 'Employment Letter',
    tenancy_agreement: 'Tenancy Agreement',
    utility_bill: 'Utility Bill',
    p60: 'P60 Tax Certificate',
    p45: 'P45',
    tax_return: 'Self Assessment Tax Return',
    other: 'Other Document',
};
exports.DOCUMENT_VERIFICATION_WEIGHTS = {
    passport: 20,
    biometric_residence_permit: 20,
    national_id: 15,
    driving_licence: 10,
    bank_statement: 15,
    payslip: 12,
    employment_letter: 10,
    tenancy_agreement: 12,
    p60: 12,
    p45: 10,
    tax_return: 15,
    utility_bill: 8,
    other: 5,
};
//# sourceMappingURL=documents.js.map