"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2).max(100).optional(),
    dob: zod_1.z.string().optional(),
    nationality: zod_1.z.string().min(2).optional(),
    residencyStatus: zod_1.z
        .enum([
        'british_citizen',
        'settled_status',
        'pre_settled_status',
        'student_visa',
        'work_visa',
        'refugee',
        'asylum_seeker',
        'other',
    ])
        .optional(),
    employmentType: zod_1.z
        .enum([
        'employed_full_time',
        'employed_part_time',
        'self_employed',
        'gig_worker',
        'student',
        'graduate',
        'unemployed',
        'other',
    ])
        .optional(),
    monthlyIncomeDeclared: zod_1.z.number().min(0).max(500_000).optional(),
    monthlyRentDeclared: zod_1.z.number().min(0).max(50_000).optional(),
});
//# sourceMappingURL=profile.js.map