import { IsArray, IsOptional, IsString } from 'class-validator'

/**
 * Which evidence to exclude when previewing the impact of removing it.
 * Both optional; an empty request previews "no change".
 */
export class ImpactPreviewDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeConnectionIds?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeDocumentIds?: string[]
}
