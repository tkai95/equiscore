import { Injectable, Logger } from '@nestjs/common'
import { db } from '@equiscore/database'
import { TrueLayerService } from './truelayer.service'
import { ConfigService } from '@nestjs/config'

const CATEGORY_MAP: Record<string, string> = {
  SALARY: 'salary',
  INCOME: 'salary',
  RENTAL: 'rent_payment',
  BILLS: 'utilities',
  TRANSPORT: 'transport',
  SHOPPING: 'groceries',
  ENTERTAINMENT: 'entertainment',
  HEALTHCARE: 'healthcare',
  EDUCATION: 'education',
  SAVINGS: 'savings_transfer',
  LOAN_REPAYMENT: 'loan_repayment',
  GOVERNMENT: 'government_benefit',
  INVESTMENT: 'investment',
  CASH: 'cash_withdrawal',
}

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name)

  constructor(
    private readonly trueLayer: TrueLayerService,
    private readonly config: ConfigService
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
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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

    return connection
  }

  async syncConnection(connectionId: string, accessToken?: string) {
    const connection = await db.bankConnection.findUnique({
      where: { id: connectionId },
    })
    if (!connection) return

    const token = accessToken ?? connection.accessToken ?? ''
    const tlAccounts = await this.trueLayer.getAccounts(token)

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
        await db.bankTransaction.upsert({
          where: {
            bankAccountId_externalTxnId: {
              bankAccountId: account.id,
              externalTxnId: txn.transaction_id,
            },
          },
          update: {},
          create: {
            bankAccountId: account.id,
            externalTxnId: txn.transaction_id,
            bookedAt: new Date(txn.timestamp),
            amount: Math.abs(txn.amount),
            currency: txn.currency,
            description: txn.description,
            merchantName: txn.merchant_name,
            category: this.mapCategory(txn.transaction_category),
            direction: txn.amount >= 0 ? 'credit' : 'debit',
            rawPayload: txn as never,
          },
        })
      }
    }

    await db.bankConnection.update({
      where: { id: connectionId },
      data: { lastSyncedAt: new Date() },
    })

    this.logger.log(`Synced ${tlAccounts.length} accounts for connection ${connectionId}`)
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

  private mapAccountType(type: string): 'current' | 'savings' | 'credit_card' | 'business' {
    const t = type.toLowerCase()
    if (t.includes('saving')) return 'savings'
    if (t.includes('credit')) return 'credit_card'
    if (t.includes('business')) return 'business'
    return 'current'
  }

  private mapCategory(category: string): string | undefined {
    return CATEGORY_MAP[category.toUpperCase()] ?? 'other'
  }
}
