import {
  IsEmail,
  IsIn,
  IsISO8601,
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
