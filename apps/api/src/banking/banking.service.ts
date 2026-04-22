import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { db } from '@equiscore/database'
import { TrueLayerService } from './truelayer.service'
import { ConfigService } from '@nestjs/config'
import { ScoringService } from '../scoring/scoring.service'
import { AuditService } from '../audit/audit.service'
import { encrypt, decrypt } from '../common/utils/encryption'
import { classifyTransaction } from './transaction-classifier'

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name)

  constructor(
    private readonly trueLayer: TrueLayerService,
    private readonly config: ConfigService,
    private readonly scoringService: ScoringService,
    private readonly audit: AuditService
  ) {}

  buildLinkUrl(userId: string): string {
    const redirectUri = `${this.config.get('API_URL')}/api/v1/open-banking/callback`
    return this.trueLayer.buildAuthUrl(redirectUri, userId)
  }

  async handleCallback(code: string, state: string) {
    const userId = state
    const redirectUri = `${this.config.get('API_URL')}/api/v1/open-banking/callback`

    const tokens = await this.trueLayer.exchangeCode(code, redirectUri)
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000)

    const connection = await db.bankConnection.create({
      data: {
        userId,
        providerName: 'truelayer',
        connectionStatus: 'active',
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        tokenExpiresAt: expiresAt,
      },
    })

    await this.syncConnection(connection.id, tokens.accessToken)

    await db.userProfile.updateMany({
      where: {
        userId,
        profileStage: { notIn: ['scored', 'complete'] },
      },
      data: { profileStage: 'banking_connected' },
    })

    this.audit.log(userId, 'bank.connected', { connectionId: connection.id })

    try {
      await this.scoringService.recompute(userId)
    } catch (err) {
      this.logger.warn(`Score auto-recompute failed after bank connect: ${String(err)}`)
    }

    return connection
  }

  async syncConnection(connectionId: string, accessToken?: string) {
    const connection = await db.bankConnection.findUnique({
      where: { id: connectionId },
    })
    if (!connection) return

    const token = accessToken ?? decrypt(connection.accessToken ?? '')
    const tlAccounts = await this.trueLayer.getAccounts(token)

    const institutionName = tlAccounts[0]?.provider?.display_name ?? null
    if (institutionName) {
      await db.bankConnection.update({
        where: { id: connectionId },
        data: { institutionName },
      })
    }

    for (const tlAccount of tlAccounts) {
      const balance = await this.trueLayer.getBalance(token, tlAccount.account_id)

      const account = await db.bankAccount.upsert({
        where: {
          bankConnectionId_externalAccountId: {
            bankConnectionId: connectionId,
            externalAccountId: tlAccount.account_id,
          },
        },
        update: {
          accountName: tlAccount.display_name,
          accountType: this.mapAccountType(tlAccount.account_type),
          currentBalance: balance ?? undefined,
          syncedAt: new Date(),
        },
        create: {
          bankConnectionId: connectionId,
          externalAccountId: tlAccount.account_id,
          accountName: tlAccount.display_name,
          accountHolderName: undefined,
          accountType: this.mapAccountType(tlAccount.account_type),
          currency: tlAccount.currency,
          currentBalance: balance ?? undefined,
          syncedAt: new Date(),
        },
      })

      const transactions = await this.trueLayer.getTransactions(token, tlAccount.account_id)

      for (const txn of transactions) {
        try {
          await db.bankTransaction.upsert({
            where: {
              bankAccountId_externalTxnId: {
                bankAccountId: account.id,
                externalTxnId: txn.transaction_id,
              },
            },
            update: {
              category: classifyTransaction({
                description: txn.description ?? null,
                merchantName: txn.merchant_name ?? null,
                amount: Math.abs(txn.amount),
                direction: txn.amount >= 0 ? 'credit' : 'debit',
                tlCategory: txn.transaction_category,
              }),
            },
            create: {
              bankAccountId: account.id,
              externalTxnId: txn.transaction_id,
              bookedAt: new Date(txn.timestamp),
              amount: Math.abs(txn.amount),
              currency: txn.currency,
              description: txn.description,
              merchantName: txn.merchant_name,
              category: classifyTransaction({
                description: txn.description ?? null,
                merchantName: txn.merchant_name ?? null,
                amount: Math.abs(txn.amount),
                direction: txn.amount >= 0 ? 'credit' : 'debit',
                tlCategory: txn.transaction_category,
              }),
              direction: txn.amount >= 0 ? 'credit' : 'debit',
              rawPayload: txn as never,
            },
          })
        } catch (err) {
          this.logger.warn(`Skipping transaction ${txn.transaction_id}: ${String(err)}`)
        }
      }

      // Direct debits
      const directDebits = await this.trueLayer.getDirectDebits(token, tlAccount.account_id)
      for (const dd of directDebits) {
        try {
          await db.directDebit.upsert({
            where: { bankAccountId_externalId: { bankAccountId: account.id, externalId: dd.direct_debit_id } },
            update: { name: dd.name, status: dd.status, previousAmount: dd.previous_payment_amount, previousPaymentDate: dd.previous_payment_timestamp ? new Date(dd.previous_payment_timestamp) : null },
            create: { bankAccountId: account.id, externalId: dd.direct_debit_id, name: dd.name, currency: dd.currency, status: dd.status, previousAmount: dd.previous_payment_amount, previousPaymentDate: dd.previous_payment_timestamp ? new Date(dd.previous_payment_timestamp) : null },
          })
        } catch (err) {
          this.logger.warn(`Skipping direct debit ${dd.direct_debit_id}: ${String(err)}`)
        }
      }

      // Standing orders
      const standingOrders = await this.trueLayer.getStandingOrders(token, tlAccount.account_id)
      for (const so of standingOrders) {
        try {
          await db.standingOrder.upsert({
            where: { bankAccountId_externalId: { bankAccountId: account.id, externalId: so.standing_order_id } },
            update: { reference: so.reference, frequency: so.frequency, status: so.status, nextPaymentDate: so.next_payment_date ? new Date(so.next_payment_date) : null, nextPaymentAmount: so.next_payment_amount },
            create: { bankAccountId: account.id, externalId: so.standing_order_id, reference: so.reference, currency: so.currency, frequency: so.frequency, status: so.status, nextPaymentDate: so.next_payment_date ? new Date(so.next_payment_date) : null, nextPaymentAmount: so.next_payment_amount, firstPaymentDate: so.first_payment_date ? new Date(so.first_payment_date) : null },
          })
        } catch (err) {
          this.logger.warn(`Skipping standing order ${so.standing_order_id}: ${String(err)}`)
        }
      }
    }

    // Identity — store verified name on accounts
    const identity = await this.trueLayer.getIdentity(token)
    if (identity?.full_name) {
      await db.bankAccount.updateMany({
        where: { bankConnectionId: connectionId },
        data: { accountHolderName: identity.full_name },
      })
    }

    await db.bankConnection.update({
      where: { id: connectionId },
      data: { lastSyncedAt: new Date() },
    })

    this.logger.log(`Synced ${tlAccounts.length} accounts for connection ${connectionId}`)
    this.audit.log(connection.userId, 'bank.synced', {
      connectionId,
      accountsSynced: tlAccounts.length,
    })
  }

  async syncAllForUser(userId: string): Promise<number> {
    const connections = await db.bankConnection.findMany({
      where: { userId, connectionStatus: 'active' },
    })
    for (const conn of connections) {
      await this.syncConnection(conn.id)
    }
    return connections.length
  }

  async getAccounts(userId: string) {
    return db.bankAccount.findMany({
      where: {
        bankConnection: { userId },
      },
      include: {
        bankConnection: {
          select: { institutionName: true, connectionStatus: true, lastSyncedAt: true },
        },
      },
    })
  }

  async getAccountTransactions(userId: string, accountId: string) {
    const account = await db.bankAccount.findFirst({
      where: { id: accountId, bankConnection: { userId } },
      include: {
        bankConnection: { select: { institutionName: true, connectionStatus: true } },
        transactions: { orderBy: { bookedAt: 'desc' } },
        directDebits: { orderBy: { createdAt: 'desc' } },
        standingOrders: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!account) throw new NotFoundException('Account not found')
    return account
  }

  private mapAccountType(type: string): 'current' | 'savings' | 'credit_card' | 'business' {
    const t = type.toLowerCase()
    if (t.includes('saving')) return 'savings'
    if (t.includes('credit')) return 'credit_card'
    if (t.includes('business')) return 'business'
    return 'current'
  }

}
