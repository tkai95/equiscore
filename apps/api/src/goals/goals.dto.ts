import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
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
}
