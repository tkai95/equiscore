import { Injectable, Logger } from '@nestjs/common'
import { db } from '@equiscore/database'

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  log(
    userId: string,
    eventType: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): void {
    // Fire-and-forget — audit failures must never block the main request flow
    db.auditEvent
      .create({
        data: {
          userId,
          eventType,
          metadata: metadata ? (metadata as never) : undefined,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      })
      .catch((err: unknown) => {
        this.logger.error(`Failed to write audit event [${eventType}]: ${String(err)}`)
      })
  }
}
