import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { ConfigService } from '@nestjs/config'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { S3Client } from '@aws-sdk/client-s3'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import type { DocumentType } from '@equiscore/shared'

@Injectable()
export class DocumentsService {
  private s3: S3Client

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION') ?? 'eu-west-2',
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    })
  }

  async getUploadPresignedUrl(
    userId: string,
    documentType: DocumentType,
    mimeType: string
  ) {
    const bucket = this.config.get<string>('S3_BUCKET') ?? 'equiscore-documents'
    const key = `users/${userId}/documents/${documentType}/${Date.now()}`

    const { url, fields } = await createPresignedPost(this.s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 0, 10 * 1024 * 1024], // 10MB max
        ['eq', '$Content-Type', mimeType],
      ],
      Expires: 300, // 5 minutes
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
    const bucket = this.config.get<string>('S3_BUCKET') ?? 'equiscore-documents'
    const region = this.config.get<string>('AWS_REGION') ?? 'eu-west-2'
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`

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

    // Update profile stage if not yet past this point
    await db.userProfile.updateMany({
      where: {
        userId,
        profileStage: { in: ['created', 'onboarding', 'profile_building', 'banking_connected'] },
      },
      data: { profileStage: 'documents_uploaded' },
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
      new DeleteObjectCommand({
        Bucket: this.config.get<string>('S3_BUCKET') ?? 'equiscore-documents',
        Key: doc.fileKey,
      })
    )

    return db.uploadedDocument.delete({ where: { id: documentId } })
  }
}
