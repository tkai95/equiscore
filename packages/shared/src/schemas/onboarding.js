"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step4Schema = exports.step3Schema = exports.step2Schema = exports.step1Schema = void 0;
const zod_1 = require("zod");
exports.step1Schema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, 'Full name must be at least 2 characters').max(100),
    dob: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    nationality: zod_1.z.string().min(2, 'Please enter your nationality'),
});
exports.step2Schema = zod_1.z.object({
    residencyStatus: zod_1.z.enum([
        'british_citizen',
        'settled_status',
        'pre_settled_status',
        'student_visa',
        'work_visa',
        'refugee',
        'asylum_seeker',
        'other',
    ]),
    ukMoveDate: zod_1.z.string().optional(),
    addressLine1: zod_1.z.string().min(3, 'Please enter your address'),
    addressLine2: zod_1.z.string().optional(),
    city: zod_1.z.string().min(2, 'Please enter your city'),
    postcode: zod_1.z
        .string()
        .regex(/^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i, 'Please enter a valid UK postcode'),
});
exports.step3Schema = zod_1.z.object({
    employmentType: zod_1.z.enum([
        'employed_full_time',
        'employed_part_time',
        'self_employed',
        'gig_worker',
        'student',
        'graduate',
        'unemployed',
        'other',
    ]),
    employerName: zod_1.z.string().optional(),
    jobTitle: zod_1.z.string().optional(),
    monthlyIncomeDeclared: zod_1.z
        .number()
        .min(0, 'Income must be 0 or more')
        .max(500_000)
        .optional(),
    payFrequency: zod_1.z.enum(['weekly', 'fortnightly', 'monthly', 'irregular']).optional(),
});
exports.step4Schema = zod_1.z.object({
    monthlyRentDeclared: zod_1.z
        .number()
        .min(0, 'Rent must be 0 or more')
        .max(50_000)
        .optional(),
    landlordName: zod_1.z.string().optional(),
    tenancyStartDate: zod_1.z.string().optional(),
    reasonForUsingEquiscore: zod_1.z
        .enum([
        'rental_application',
        'financial_product',
        'employment_check',
        'identity_verification',
        'other',
    ])
        .optional(),
});
//# sourceMappingURL=onboarding.js.map