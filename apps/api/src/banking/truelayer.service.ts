import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface TrueLayerTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface TrueLayerAccount {
  account_id: string
  display_name: string
  account_type: string
  currency: string
  account_number?: { iban?: string; number?: string; sort_code?: string }
}

export interface TrueLayerTransaction {
  transaction_id: string
  timestamp: string
  description: string
  amount: number
  currency: string
  transaction_type: string
  transaction_category: string
  merchant_name?: string
}

@Injectable()
export class TrueLayerService {
  private readonly logger = new Logger(TrueLayerService.name)
  private readonly baseUrl: string
  private readonly authUrl: string

  constructor(private readonly config: ConfigService) {
    const isSandbox = config.get<string>('TRUELAYER_SANDBOX') !== 'false'
    this.baseUrl = isSandbox ? 'https://api.truelayer-sandbox.com' : 'https://api.truelayer.com'
    this.authUrl = isSandbox ? 'https://auth.truelayer-sandbox.com' : 'https://auth.truelayer.com'
  }

  buildAuthUrl(redirectUri: string, state: string): string {
    const clientId = this.config.get<string>('TRUELAYER_CLIENT_ID') ?? ''
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'info accounts balance transactions cards offline_access',
      redirect_uri: redirectUri,
      state,
      providers: 'uk-ob-all uk-oauth-all',
    })
    return `${this.authUrl}/?${params.toString()}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TrueLayerTokens> {
    const response = await fetch(`${this.authUrl}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.get<string>('TRUELAYER_CLIENT_ID') ?? '',
        client_secret: this.config.get<string>('TRUELAYER_CLIENT_SECRET') ?? '',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      throw new Error(`TrueLayer token exchange failed: ${response.statusText}`)
    }

    const data = (await response.json()) as { access_token: string; refresh_token: string; expires_in: number }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  }

  async getAccounts(accessToken: string): Promise<TrueLayerAccount[]> {
    const response = await fetch(`${this.baseUrl}/data/v1/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      this.logger.error(`Failed to fetch accounts: ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as { results: TrueLayerAccount[] }
    return data.results
  }

  async getTransactions(accessToken: string, accountId: string): Promise<TrueLayerTransaction[]> {
    const from = new Date()
    from.setFullYear(from.getFullYear() - 1)
    const fromStr = from.toISOString().split('T')[0]

    const response = await fetch(
      `${this.baseUrl}/data/v1/accounts/${accountId}/transactions?from=${fromStr}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!response.ok) {
      this.logger.error(`Failed to fetch transactions for ${accountId}: ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as { results: TrueLayerTransaction[] }
    return data.results
  }

  async getBalance(accessToken: string, accountId: string): Promise<number | null> {
    const response = await fetch(
      `${this.baseUrl}/data/v1/accounts/${accountId}/balance`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!response.ok) return null

    const data = (await response.json()) as { results: Array<{ available: number }> }
    return data.results[0]?.available ?? null
  }
}
