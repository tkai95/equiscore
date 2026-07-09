import {
  Body,
  Controller,
  ForbiddenException,
  BadRequestException,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { AuthService } from '../auth/auth.service'
import { InsightsService } from './insights.service'
import { PreviewProfileDto, PreviewCsvDto, ImportCsvDto } from './insights.dto'

@ApiTags('insights')
@Controller('insights')
export class InsightsController {
  constructor(
    private readonly insights: InsightsService,
    private readonly authService: AuthService
  ) {}

  /**
   * POST a set of normalized transactions and get the full insight profile back.
   * Lets us validate scoring against real anonymized statements before any PDF
   * parsing exists.
   *
   * This route is unauthenticated, so it is *fail-closed*: it stays off unless
   * INSIGHTS_PREVIEW_ENABLED is explicitly "true", and it is never available
   * when NODE_ENV is production. Relying on NODE_ENV alone would fail open on
   * any host that doesn't set it at runtime.
   */
  @Post('preview')
  @ApiOperation({ summary: 'Build an insight profile from posted transactions (opt-in, non-production)' })
  preview(@Body() dto: PreviewProfileDto) {
    const explicitlyEnabled = process.env['INSIGHTS_PREVIEW_ENABLED'] === 'true'
    const isProduction = process.env['NODE_ENV'] === 'production'
    if (!explicitlyEnabled || isProduction) {
      throw new ForbiddenException('Preview endpoint is not enabled')
    }
    return this.insights.preview(dto)
  }

  /**
   * Dev-only: parse a CSV statement and build a profile, without persisting.
   * Fail-closed exactly like /preview.
   */
  @Post('preview-csv')
  @ApiOperation({ summary: 'Parse a CSV statement into a profile (non-production, no persistence)' })
  previewCsv(@Body() dto: PreviewCsvDto) {
    const explicitlyEnabled = process.env['INSIGHTS_PREVIEW_ENABLED'] === 'true'
    if (!explicitlyEnabled || process.env['NODE_ENV'] === 'production') {
      throw new ForbiddenException('Preview endpoint is not enabled')
    }
    return this.insights.previewCsv(dto.csv, {
      accountHolderName: dto.accountHolderName,
      profileName: dto.profileName,
    })
  }

  @Get('profile')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Insight profile built from the user's stored transactions" })
  async profile(@CurrentUser() user: RequestUser) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.insights.getProfileForUser(dbUser.id)
  }

  /**
   * Import a CSV bank statement for the signed-in user: parse, persist as a
   * statement-sourced connection, and recompute the score. This is the
   * "get a score without Open Banking" path.
   */
  @Post('import-csv')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import a CSV bank statement and recompute the score' })
  async importCsv(@CurrentUser() user: RequestUser, @Body() dto: ImportCsvDto) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.insights.importCsv(dbUser.id, dto.csv)
  }

  /**
   * Import a PDF bank statement (typed or scanned): Claude extracts the
   * transactions, then they run through the same parse→score→tamper-check path.
   */
  @Post('import-pdf')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 12 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Import a PDF bank statement and recompute the score' })
  async importPdf(@CurrentUser() user: RequestUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Please upload a PDF file.')
    }
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.insights.importPdf(dbUser.id, file.buffer)
  }
}
