import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
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
  ValidateNested,
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

export class PolicyRuleInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  id?: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  inputField!: string

  @IsIn(['gte', 'lte', 'gt', 'lt', 'eq', 'neq', 'exists', 'not_empty'])
  operator!: 'gte' | 'lte' | 'gt' | 'lt' | 'eq' | 'neq' | 'exists' | 'not_empty'

  @IsOptional()
  threshold?: unknown

  @IsOptional()
  @IsIn(['number', 'currency', 'percent', 'text', 'boolean'])
  thresholdType?: 'number' | 'currency' | 'percent' | 'text' | 'boolean'

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  evidencePeriodMonths?: number

  @IsOptional()
  @IsIn(['review', 'fail', 'ignore'])
  missingDataBehaviour?: 'review' | 'fail' | 'ignore'

  @IsOptional()
  @IsIn(['high', 'medium', 'low'])
  confidenceRequirement?: 'high' | 'medium' | 'low'

  @IsOptional()
  @IsString()
  @MaxLength(160)
  passOutcome?: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  failOutcome?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  alternativePathway?: string

  @IsOptional()
  @IsBoolean()
  humanReviewRequired?: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  priority?: number
}

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string

  @IsIn(['rental', 'telecom', 'utilities', 'lending', 'other'])
  assessmentType!: 'rental' | 'telecom' | 'utilities' | 'lending' | 'other'

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyRuleInputDto)
  rules?: PolicyRuleInputDto[]

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  aiPrompt?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changeSummary?: string
}

export class UpdatePolicyVersionDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyRuleInputDto)
  rules?: PolicyRuleInputDto[]

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  aiPrompt?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changeSummary?: string
}
