"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentUploadSchema = void 0;
const zod_1 = require("zod");
exports.documentUploadSchema = zod_1.z.object({
    documentType: zod_1.z.enum([
        'passport',
        'national_id',
        'biometric_residence_permit',
        'driving_licence',
        'bank_statement',
        'payslip',
        'employment_letter',
        'tenancy_agreement',
        'utility_bill',
        'p60',
        'p45',
        'tax_return',
        'other',
    ]),
});
//# sourceMappingURL=documents.js.map