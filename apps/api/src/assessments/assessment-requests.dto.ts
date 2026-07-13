import {
  IsEmail,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateAssessmentRequestDto {
  @IsEmail()
  @MaxLength(254)
  applicantEmail!: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  applicantName?: string

  @IsIn(['rental', 'telecom', 'utilities', 'lending', 'other'])
  assessmentType!: 'rental' | 'telecom' | 'utilities' | 'lending' | 'other'

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  proposedCommitment?: number

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string

  @IsOptional()
  @IsISO8601()
  deadline?: string
}

export class RecordCaseDecisionDto {
  @IsIn([
    'approved',
    'approved_with_conditions',
    'additional_information_required',
    'guarantor_or_alternative_route_required',
    'referred_for_manual_review',
    'declined',
    'withdrawn',
    'expired_without_decision',
  ])
  decision!:
    | 'approved'
    | 'approved_with_conditions'
    | 'additional_information_required'
    | 'guarantor_or_alternative_route_required'
    | 'referred_for_manual_review'
    | 'declined'
    | 'withdrawn'
    | 'expired_without_decision'

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rationale!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conditions?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  overrideReason?: string
}

export class RequestCaseInformationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  requestType?: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  requestedFields?: string

  @IsOptional()
  @IsISO8601()
  dueAt?: string
}

export class RespondToInformationRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  response!: string
}

export class UpdateInformationRequestStatusDto {
  @IsIn(['open', 'resolved', 'cancelled'])
  status!: 'open' | 'resolved' | 'cancelled'
}
