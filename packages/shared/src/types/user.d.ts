export type EmploymentType = 'employed_full_time' | 'employed_part_time' | 'self_employed' | 'gig_worker' | 'student' | 'graduate' | 'unemployed' | 'other';
export type ResidencyStatus = 'british_citizen' | 'settled_status' | 'pre_settled_status' | 'student_visa' | 'work_visa' | 'refugee' | 'asylum_seeker' | 'other';
export type ProfileStage = 'created' | 'onboarding' | 'profile_building' | 'banking_connected' | 'documents_uploaded' | 'scored' | 'complete';
export interface UserAddress {
    id: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postcode: string;
    country: string;
    fromDate: string;
    toDate?: string;
    isCurrent: boolean;
}
export interface UserProfile {
    id: string;
    userId: string;
    fullName: string;
    dob: string;
    nationality: string;
    residencyStatus: ResidencyStatus;
    ukMoveDate?: string;
    currentAddress?: UserAddress;
    employmentType: EmploymentType;
    monthlyIncomeDeclared?: number;
    monthlyRentDeclared?: number;
    profileStage: ProfileStage;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=user.d.ts.map