import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  Matches,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator'
import { isValidPastMonth } from '@equiscore/shared'

// The service passes these to `new Date()`, which turns free text into a wrong
// date or an Invalid Date that fails to write. An empty string means not given.
@ValidatorConstraint({ name: 'isOptionalPastMonth' })
class IsOptionalPastMonth implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && (value === '' || isValidPastMonth(value))
  }

  defaultMessage(): string {
    return 'Date must be a month in YYYY-MM format that is not in the future'
  }
}

// DTO for PUT /profile/onboarding. The global ValidationPipe runs with
// `whitelist: true, forbidNonWhitelisted: true`, which REQUIRES a real class to
// introspect — without one (the old `Record<string, unknown>`), every field got
// stripped and the service received an empty object, crashing on date parsing.
// Every onboarding field is listed here so the pipe knows what to keep.
// Optional fields are explicitly marked; the service tolerates their absence.

export class OnboardingDto {
  // Step 1 — personal
  @IsString()
  firstName!: string

  @IsString()
  lastName!: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  dob!: string

  // Step 2 — address / residency
  @IsString()
  residencyStatus!: string

  @IsOptional()
  @Validate(IsOptionalPastMonth)
  ukMoveDate?: string

  @IsString()
  addressLine1!: string

  @IsOptional()
  @IsString()
  addressLine2?: string

  @IsString()
  city!: string

  @IsString()
  postcode!: string

  // Step 3 — employment
  @IsOptional()
  @IsString()
  employmentType?: string

  @IsOptional()
  @IsString()
  employerName?: string

  @IsOptional()
  @IsString()
  jobTitle?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500_000)
  monthlyIncomeDeclared?: number

  @IsOptional()
  @IsString()
  payFrequency?: string

  // Step 4 — rental
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50_000)
  monthlyRentDeclared?: number

  @IsOptional()
  @IsString()
  landlordName?: string

  @IsOptional()
  @Validate(IsOptionalPastMonth)
  tenancyStartDate?: string

  @IsOptional()
  @IsString()
  reasonForUsingEquiscore?: string
}

// DTO for PATCH /profile/address — edit the user's current address in place.
// Same field shape + validators as the onboarding address fields, so the two
// paths accept identical input.
export class UpdateAddressDto {
  @IsString()
  addressLine1!: string

  @IsOptional()
  @IsString()
  addressLine2?: string

  @IsString()
  city!: string

  @IsString()
  postcode!: string
}
