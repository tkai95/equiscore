import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { ConfigService } from '@nestjs/config'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import type { DocumentType } from '@equiscore/shared'
import { AuditService } from '../audit/audit.service'
import { ScoringService } from '../scoring/scoring.service'

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name)
  private s3: S3Client
  private bucket: string

  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly scoringService: ScoringService
  ) {
    const projectRef = config.get<string>('SUPABASE_PROJECT_REF') ?? ''
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'equiscore-documents'

    // Supabase Storage is S3-compatible — just point the SDK at their endpoint
    this.s3 = new S3Client({
      forcePathStyle: true,
      region: config.get<string>('SUPABASE_S3_REGION') ?? 'eu-west-2',
      endpoint: `https://${projectRef}.supabase.co/storage/v1/s3`,
      credentials: {
        accessKeyId: config.get<string>('SUPABASE_S3_ACCESS_KEY_ID') ?? '',
        secretAccessKey: config.get<string>('SUPABASE_S3_SECRET_ACCESS_KEY') ?? '',
      },
    })
  }

  async getUploadPresignedUrl(userId: string, documentType: DocumentType, mimeType: string) {
    // Fail loud and specific if document storage isn't configured, rather than
    // surfacing an opaque 500. These are separate from DATABASE_URL and must be
    // set on the API host (Railway) for uploads to work.
    const required = ['SUPABASE_PROJECT_REF', 'SUPABASE_S3_ACCESS_KEY_ID', 'SUPABASE_S3_SECRET_ACCESS_KEY']
    const missing = required.filter((k) => !this.config.get<string>(k))
    if (missing.length > 0) {
      this.logger.error(`Document storage not configured — missing env: ${missing.join(', ')}`)
      throw new ServiceUnavailableException('Document uploads are not available right now.')
    }

    const key = `users/${userId}/documents/${documentType}/${Date.now()}`

    try {
      const { url, fields } = await createPresignedPost(this.s3, {
        Bucket: this.bucket,
        Key: key,
        Conditions: [
          ['content-length-range', 0, 10 * 1024 * 1024], // 10 MB max
          ['eq', '$Content-Type', mimeType],
        ],
        Expires: 300,
      })
      return { uploadUrl: url, fields, key }
    } catch (err) {
      // Surfaces the real cause (bad bucket, region, credentials) into the log
      // while returning a clean message to the client.
      this.logger.error(`Presigned upload URL generation failed for bucket "${this.bucket}": ${String(err)}`)
      throw new ServiceUnavailableException('Could not prepare the upload. Please try again shortly.')
    }
  }

  async confirmUpload(
    userId: string,
    documentType: DocumentType,
    fileKey: string,
    mimeType: string,
    fileSizeBytes?: number
  ) {
    const projectRef = this.config.get<string>('SUPABASE_PROJECT_REF') ?? ''
    const fileUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${this.bucket}/${fileKey}`

    const doc = await db.uploadedDocument.create({
      data: {
        userId,
        documentType,
        fileUrl,
        fileKey,
        mimeType,
        fileSizeBytes,
        verificationStatus: 'pending',
      },
    })

    await db.userProfile.updateMany({
      where: {
        userId,
        profileStage: { in: ['created', 'onboarding', 'profile_building', 'banking_connected'] },
      },
      data: { profileStage: 'documents_uploaded' },
    })

    this.audit.log(userId, 'document.uploaded', {
      documentId: doc.id,
      documentType,
      mimeType,
    })

    // Adding evidence changes the score — recompute so the profile stays truthful.
    await this.recomputeQuietly(userId, 'document upload')

    return doc
  }

  async getDocuments(userId: string) {
    return db.uploadedDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    })
  }

  async deleteDocument(userId: string, documentId: string) {
    const doc = await db.uploadedDocument.findFirst({
      where: { id: documentId, userId },
    })
    if (!doc) throw new NotFoundException('Document not found')

    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: doc.fileKey })
    )

    const deleted = await db.uploadedDocument.delete({ where: { id: documentId } })

    this.audit.log(userId, 'document.deleted', {
      documentId,
      documentType: doc.documentType,
    })

    // Removing evidence must never leave a score that still counts it.
    await this.recomputeQuietly(userId, 'document deletion')

    return deleted
  }

  /**
   * Any change to the evidence a user holds invalidates their current score.
   * Recompute is best-effort: a scoring failure must not roll back the user's
   * upload or, more importantly, their deletion.
   */
  private async recomputeQuietly(userId: string, reason: string): Promise<void> {
    try {
      await this.scoringService.recompute(userId)
    } catch (err) {
      this.logger.warn(`Score recompute failed after ${reason}: ${String(err)}`)
    }
  }
}
