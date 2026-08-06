import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class UpdateConsumerGoalDto {
  @IsOptional()
  @IsIn([
    'rental',
    'banking_access',
    'utilities_phone',
    'future_credit',
    'income_proof',
    'stronger_profile',
  ])
  type?:
    | 'rental'
    | 'banking_access'
    | 'utilities_phone'
    | 'future_credit'
    | 'income_proof'
    | 'stronger_profile'

  @IsOptional()
  @IsIn(['active', 'paused', 'archived'])
  status?: 'active' | 'paused' | 'archived'

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string | null

  @IsOptional()
  @IsIn(['high', 'normal', 'low'])
  priority?: 'high' | 'normal' | 'low' | null

  @IsOptional()
  @IsISO8601()
  targetDate?: string | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  targetAmount?: number | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  currentAmount?: number | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  monthlyContribution?: number | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  reservedFunds?: number | null

  @IsOptional()
  @IsObject()
  assumptions?: Record<string, unknown> | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000)
  targetMonthlyRent?: number | null

  @IsOptional()
  @IsISO8601()
  moveDate?: string | null

  @IsOptional()
  @IsIn(['alone', 'joint', 'unknown'])
  applicationMode?: 'alone' | 'joint' | 'unknown' | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  depositAvailable?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null

  @IsOptional()
  @IsISO8601()
  completedAt?: string | null
}
