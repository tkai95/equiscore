import {
  Body,
  Controller,
  ForbiddenException,
  BadRequestException,
  Get,
  Param,
  Query,
  Post,
  HttpCode,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'
import type { Response } from 'express'
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

  /** Capture the user's explanation of a flagged/ambiguous transaction. */
  @Post('questions/answer')
  @HttpCode(200)
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Answer a follow-up question about a flagged transaction' })
  async answerQuestion(
    @CurrentUser() user: RequestUser,
    @Body() body: { questionId?: string; answer?: string }
  ) {
    if (!body?.questionId || !body?.answer) {
      throw new BadRequestException('questionId and answer are required')
    }
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.insights.answerQuestion(dbUser.id, body.questionId, body.answer)
  }

  /** Grounded assistant — answers questions about the user's profile, payments, or the site. */
  @Post('chat')
  @HttpCode(200)
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ask the assistant about your profile, payments, or the site' })
  async chat(
    @CurrentUser() user: RequestUser,
    @Body() body: { message?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> }
  ) {
    if (!body?.message || body.message.trim().length === 0) {
      throw new BadRequestException('message is required')
    }
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.insights.chat(dbUser.id, body.message.slice(0, 2000), (body.history ?? []).slice(-8))
  }

  /** Streaming assistant (Server-Sent Events) — tokens arrive as they're generated. */
  @Post('chat/stream')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Streaming assistant (SSE)' })
  async chatStream(
    @CurrentUser() user: RequestUser,
    @Body() body: { message?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> },
    @Res() res: Response
  ) {
    if (!body?.message || body.message.trim().length === 0) {
      res.status(400).json({ message: 'message is required' })
      return
    }
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    try {
      await this.insights.chatStream(
        dbUser.id,
        body.message.slice(0, 2000),
        (body.history ?? []).slice(-8),
        (token) => res.write(`data: ${JSON.stringify({ token })}\n\n`),
        (tool) => res.write(`data: ${JSON.stringify({ tool })}\n\n`)
      )
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    } catch {
      res.write(`data: ${JSON.stringify({ error: true })}\n\n`)
    }
    res.end()
  }

  /** Drill-down behind a category, commitment, or month (the click-through drawers). */
  @Get('breakdown')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transactions and sub-aggregates behind a category, commitment, or month' })
  async breakdown(
    @CurrentUser() user: RequestUser,
    @Query('type') type: string,
    @Query('key') key: string
  ) {
    if (!type || !key) throw new BadRequestException('type and key are required')
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.insights.getBreakdown(dbUser.id, type, key)
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
   * Import a PDF bank statement (typed or scanned). Reading a PDF with Claude
   * takes 30–90s, so this returns a job immediately and processes in the
   * background — the client polls the job and shows a completion chip. The user
   * can navigate away or close the browser; the job survives in the DB.
   */
  @Post('import-pdf')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 12 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Start an async PDF statement import; returns a job to poll' })
  async importPdf(@CurrentUser() user: RequestUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Please upload a PDF file.')
    }
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.insights.startPdfImportJob(dbUser.id, file.buffer, file.originalname)
  }

  /** Recent import jobs — drives the global "analysis complete" chip. */
  @Get('import-jobs')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List recent statement import jobs' })
  async importJobs(@CurrentUser() user: RequestUser) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.insights.listImportJobs(dbUser.id)
  }

  /** Poll a single import job's status/result. */
  @Get('import-jobs/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a statement import job by id' })
  async importJob(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    const job = await this.insights.getImportJob(dbUser.id, id)
    if (!job) throw new BadRequestException('Import not found')
    return job
  }

  /** Cancel an in-progress import (best-effort: the result is discarded). */
  @Post('import-jobs/:id/cancel')
  @HttpCode(200)
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an in-progress statement import' })
  async cancelImportJob(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    return this.insights.cancelImportJob(dbUser.id, id)
  }
}
