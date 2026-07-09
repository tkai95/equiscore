import { Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMaxSize,
  MaxLength,
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

const MAX_CSV_CHARS = 8_000_000 // ~8MB of text; comfortably covers years of statements

export class PreviewCsvDto {
  @IsString()
  @MaxLength(MAX_CSV_CHARS)
  csv!: string

  @IsOptional()
  @IsString()
  accountHolderName?: string

  @IsOptional()
  @IsString()
  profileName?: string
}

export class ImportCsvDto {
  @IsString()
  @MaxLength(MAX_CSV_CHARS)
  csv!: string
}
