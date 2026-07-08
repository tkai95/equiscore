import { Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator'

export class NormalizedTxnDto {
  @IsString()
  date!: string

  @IsNumber()
  amount!: number

  @IsIn(['credit', 'debit'])
  direction!: 'credit' | 'debit'

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  merchantName?: string | null

  @IsOptional()
  @IsNumber()
  balance?: number | null
}

export class PreviewProfileDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => NormalizedTxnDto)
  transactions!: NormalizedTxnDto[]

  @IsOptional()
  @IsIn(['open_banking', 'statement_upload', 'test'])
  source?: 'open_banking' | 'statement_upload' | 'test'

  @IsOptional()
  @IsString()
  accountHolderName?: string

  @IsOptional()
  @IsString()
  profileName?: string

  @IsOptional()
  @IsNumber()
  declaredMonthlyRent?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resolvedQuestionIds?: string[]
}
