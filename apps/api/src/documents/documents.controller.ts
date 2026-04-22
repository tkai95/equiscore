import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'
import { DocumentsService } from './documents.service'
import { AuthService } from '../auth/auth.service'
import type { DocumentType } from '@equiscore/shared'

@ApiTags('documents')
@Controller('documents')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly authService: AuthService
  ) {}

  private async resolveUserId(clerkId: string, email: string): Promise<string> {
    const user = await this.authService.syncUser(clerkId, email)
    return user.id
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Get a presigned S3 URL for direct client upload' })
  async getUploadUrl(
    @CurrentUser() user: RequestUser,
    @Body() body: { documentType: DocumentType; mimeType: string }
  ) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.documentsService.getUploadPresignedUrl(userId, body.documentType, body.mimeType)
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm an upload and register the document' })
  async confirmUpload(
    @CurrentUser() user: RequestUser,
    @Body() body: { documentType: DocumentType; fileKey: string; mimeType: string; fileSizeBytes?: number }
  ) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.documentsService.confirmUpload(userId, body.documentType, body.fileKey, body.mimeType, body.fileSizeBytes)
  }

  @Get()
  @ApiOperation({ summary: 'List all uploaded documents' })
  async list(@CurrentUser() user: RequestUser) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.documentsService.getDocuments(userId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  async delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const userId = await this.resolveUserId(user.clerkId, user.email)
    return this.documentsService.deleteDocument(userId, id)
  }
}
