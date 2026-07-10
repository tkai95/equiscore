import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { ConfigService } from '@nestjs/config'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import type { DocumentType } from '@equiscore/shared'
import { AuditService } from '../audit/audit.service'
import { ScoringService } from '../scoring/scoring.service'
import { extractDocumentFields } from './document-extractor'
import { matchDocument, verdictFor, type ProfileFacts } from './document-claims'

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

    // Supabase's S3 endpoint lives on a dedicated `.storage.supabase.co` subdomain
    // (NOT `<ref>.supabase.co`). Prefer the exact endpoint from the dashboard via
    // SUPABASE_S3_ENDPOINT; fall back to the correct constructed form.
    const endpoint =
      config.get<string>('SUPABASE_S3_ENDPOINT') ??
      `https://${projectRef}.storage.supabase.co/storage/v1/s3`

    this.s3 = new S3Client({
      forcePathStyle: true,
      region: config.get<string>('SUPABASE_S3_REGION') ?? 'eu-west-1',
      endpoint,
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

    // Read the document and verify it against the profile in the background:
    // extraction is a Claude call (seconds), so we return immediately with the
    // document still "pending" and let the client poll for the verified/needs-
    // review/rejected outcome. Processing recomputes the score itself when done.
    void this.processDocumentQuietly(userId, doc.id)

    return doc
  }

  /**
   * Read an uploaded document, decide whether it genuinely corroborates the
   * profile, and persist the verdict + extracted fields. Best-effort: any
   * failure leaves the document 'pending' and still recomputes the score.
   */
  async processDocumentQuietly(userId: string, documentId: string): Promise<void> {
    try {
      const apiKey = process.env['ANTHROPIC_API_KEY']
      const [doc, user] = await Promise.all([
        db.uploadedDocument.findFirst({ where: { id: documentId, userId } }),
        db.user.findUnique({
          where: { id: userId },
          include: { profile: true, addresses: { where: { isCurrent: true }, take: 1 } },
        }),
      ])
      if (!doc || !apiKey) return

      const base64 = await this.getObjectBase64(doc.fileKey)
      if (!base64) return

      const fields = await extractDocumentFields(apiKey, base64, doc.mimeType ?? 'application/pdf', doc.documentType)

      const address = user?.addresses[0]
      const profileFacts: ProfileFacts = {
        fullName: user?.profile?.fullName ?? null,
        dob: user?.profile?.dob ?? null,
        addressLine1: address?.addressLine1 ?? null,
        postcode: address?.postcode ?? null,
      }
      const match = matchDocument(fields, profileFacts)
      const verdict = verdictFor(doc.documentType, fields, match)

      await db.uploadedDocument.update({
        where: { id: doc.id },
        data: {
          verificationStatus: verdict,
          reviewedAt: new Date(),
          // Persist the read + the checks, so the UI can say *what* was verified
          // and the feature engineer can score by claim.
          extractedMetadata: {
            detectedDocumentType: fields.detectedDocumentType,
            looksAuthentic: fields.looksAuthentic,
            readable: fields.readable,
            hasName: fields.fullName !== null,
            hasDob: fields.dateOfBirth !== null,
            hasAddress: fields.address !== null || fields.postcode !== null,
            nameMatch: match.nameMatch,
            dobMatch: match.dobMatch,
            addressMatch: match.addressMatch,
            expired: match.expired,
          },
        },
      })

      this.audit.log(userId, 'document.verified', { documentId: doc.id, verdict })
    } catch (err) {
      this.logger.warn(`Document processing failed for ${documentId}: ${String(err)}`)
    } finally {
      // The document's evidence value has changed either way — reflect it.
      await this.recomputeQuietly(userId, 'document processing')
    }
  }

  /** Fetch a stored object as base64 for the extractor. Returns null on failure. */
  private async getObjectBase64(fileKey: string): Promise<string | null> {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: fileKey }))
      const bytes = await res.Body?.transformToByteArray()
      if (!bytes) return null
      return Buffer.from(bytes).toString('base64')
    } catch (err) {
      this.logger.warn(`Could not fetch document ${fileKey} for extraction: ${String(err)}`)
      return null
    }
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
