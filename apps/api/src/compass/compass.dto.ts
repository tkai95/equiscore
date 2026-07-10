import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class ConfirmCommitmentDto {
  @IsIn(['active', 'inactive', 'unknown'])
  status!: 'active' | 'inactive' | 'unknown'

  /** Friendly commitment name, used only for the reminder title. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsISO8601()
  renewalDate?: string

  @IsOptional()
  @IsBoolean()
  remind?: boolean
}

export class CreateReminderDto {
  @IsString()
  @MaxLength(120)
  title!: string

  @IsISO8601()
  dueDate!: string

  @IsOptional()
  @IsIn(['renewal', 'review', 'free_trial', 'custom'])
  type?: 'renewal' | 'review' | 'free_trial' | 'custom'

  @IsOptional()
  @IsString()
  @MaxLength(200)
  commitmentKey?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(365, { each: true })
  offsetDays?: number[]
}

export class ReminderStatusDto {
  @IsIn(['completed', 'dismissed'])
  status!: 'completed' | 'dismissed'
}

export class UpsertGoalDto {
  @IsOptional()
  @IsIn(['emergency_buffer', 'custom'])
  type?: 'emergency_buffer' | 'custom'

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string

  @IsNumber()
  @IsPositive()
  @Max(10_000_000)
  targetAmount!: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  targetMonths?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  monthlyContribution?: number
}
