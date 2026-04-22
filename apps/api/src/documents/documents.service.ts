import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { ConfigService } from '@nestjs/config'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import type { DocumentType } from '@equiscore/shared'
import { AuditService } from '../audit/audit.service'

@Injectable()
export class DocumentsService {
  private s3: S3Client
  private bucket: string

  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService
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
    const key = `users/${userId}/documents/${documentType}/${Date.now()}`

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

    return deleted
  }
}
