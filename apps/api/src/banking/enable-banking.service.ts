import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash, createPrivateKey, createSign, type KeyObject } from 'crypto'

/**
 * Enable Banking API client (account information).
 *
 * Auth is a per-request RS256 JWT signed with the application's private key
 * (kid = application id), not an OAuth token. The consent flow is:
 *   POST /auth  -> redirect the user to the returned bank URL
 *   (bank redirects back with ?code) -> POST /sessions {code} -> account uids
 *   GET /accounts/{uid}/balances | /transactions  (app JWT + valid consent)
 *
 * Docs: https://enablebanking.com/docs/api/quick-start/
 */

const BASE_URL = 'https://api.enablebanking.com'

export interface EbAspsp {
  name: string
  country: string
  logo?: string
  psu_types?: string[]
}

export interface EbAccountId {
  iban?: string
  other?: { identification?: string }
}

export interface EbAccount {
  uid: string
  identification_hash?: string
  account_id?: EbAccountId
  name?: string
  product?: string
  cash_account_type?: string
  usage?: string
  currency?: string
}

interface EbAmount {
  amount?: string
  currency?: string
}

export interface EbTransaction {
  entry_reference?: string
  transaction_amount?: EbAmount
  credit_debit_indicator?: 'CRDT' | 'DBIT'
  status?: string
  booking_date?: string
  value_date?: string
  transaction_date?: string
  remittance_information?: string[]
  creditor?: { name?: string }
  debtor?: { name?: string }
  bank_transaction_code?: { description?: string }
}

interface EbBalance {
  balance_amount?: EbAmount
  balance_type?: string
}

@Injectable()
export class EnableBankingService {
  private readonly logger = new Logger(EnableBankingService.name)
  private readonly appId: string
  private readonly key: KeyObject | null = null

  constructor(config: ConfigService) {
    this.appId = config.get<string>('ENABLE_BANKING_APP_ID') ?? ''
    // Railway stores the PEM with literal "\n" — normalise to real newlines.
    const pem = (config.get<string>('ENABLE_BANKING_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n')
    if (pem) {
      try {
        this.key = createPrivateKey(pem)
      } catch (err) {
        this.logger.error(`Enable Banking private key is invalid: ${String(err)}`)
      }
    }
  }

  /** Whether the app id + private key are present and usable. */
  get configured(): boolean {
    return !!this.key && !!this.appId
  }

  /** Build a short-lived (1h) RS256 JWT for the Authorization header. */
  private jwt(): string {
    if (!this.key || !this.appId) throw new Error('Enable Banking is not configured')
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const header = { typ: 'JWT', alg: 'RS256', kid: this.appId }
    const payload = { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600 }
    const signingInput = `${b64(header)}.${b64(payload)}`
    const signature = createSign('RSA-SHA256').update(signingInput).sign(this.key).toString('base64url')
    return `${signingInput}.${signature}`
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.jwt()}`,
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Enable Banking ${path} failed: ${res.status} ${body.slice(0, 300)}`)
    }
    return res.json() as Promise<T>
  }

  async getAspsps(country = 'GB'): Promise<EbAspsp[]> {
    const data = await this.req<{ aspsps: EbAspsp[] }>(`/aspsps?country=${encodeURIComponent(country)}`)
    return data.aspsps ?? []
  }

  /** Start authorization; returns the bank URL to redirect the user to. */
  async startAuth(
    aspspName: string,
    country: string,
    state: string,
    redirectUrl: string,
    validDays = 90,
  ): Promise<{ url: string; authorization_id?: string }> {
    const validUntil = new Date(Date.now() + validDays * 86_400_000).toISOString()
    return this.req<{ url: string; authorization_id?: string }>(`/auth`, {
      method: 'POST',
      body: JSON.stringify({
        access: { valid_until: validUntil },
        aspsp: { name: aspspName, country },
        state,
        redirect_url: redirectUrl,
        psu_type: 'personal',
      }),
    })
  }

  /** Exchange the callback code for a session (the granted account uids). */
  async createSession(code: string): Promise<{
    session_id: string
    accounts: EbAccount[]
    aspsp?: { name?: string; country?: string }
    access?: { valid_until?: string }
  }> {
    return this.req(`/sessions`, { method: 'POST', body: JSON.stringify({ code }) })
  }

  async getBalances(accountUid: string): Promise<EbBalance[]> {
    const data = await this.req<{ balances: EbBalance[] }>(`/accounts/${accountUid}/balances`)
    return data.balances ?? []
  }

  /** All transactions since `dateFrom` (YYYY-MM-DD), following continuation keys. */
  async getTransactions(accountUid: string, dateFrom: string): Promise<EbTransaction[]> {
    const out: EbTransaction[] = []
    let continuation: string | undefined
    let pages = 0
    do {
      const q = new URLSearchParams({ date_from: dateFrom })
      if (continuation) q.set('continuation_key', continuation)
      const data = await this.req<{ transactions: EbTransaction[]; continuation_key?: string }>(
        `/accounts/${accountUid}/transactions?${q.toString()}`,
      )
      out.push(...(data.transactions ?? []))
      continuation = data.continuation_key
      pages++
    } while (continuation && pages < 25)
    return out
  }

  /** Best-effort account owner name (for name-match); null if unavailable. */
  async getAccountHolderName(accountUid: string): Promise<string | null> {
    try {
      const d = await this.req<{ name?: string; account_id?: EbAccountId }>(`/accounts/${accountUid}/details`)
      return d.name ?? null
    } catch {
      return null
    }
  }

  /** Revoke a session (withdraw consent). Best-effort. */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await this.req(`/sessions/${sessionId}`, { method: 'DELETE' })
      return true
    } catch (err) {
      this.logger.warn(`Enable Banking session revoke failed: ${String(err)}`)
      return false
    }
  }

  // ─── Field mappers (Berlin Group shapes → our normalized fields) ────────────

  static balanceAmount(balances: EbBalance[]): number | null {
    if (balances.length === 0) return null
    // Prefer interim available, then closing booked, else the first.
    const pick =
      balances.find((b) => b.balance_type === 'ITAV') ??
      balances.find((b) => b.balance_type === 'CLBD') ??
      balances[0]
    const raw = pick?.balance_amount?.amount
    const n = raw != null ? Number(raw) : NaN
    return Number.isFinite(n) ? n : null
  }

  static txnExternalId(t: EbTransaction): string {
    if (t.entry_reference) return t.entry_reference
    const basis = [
      t.booking_date ?? t.value_date ?? '',
      t.transaction_amount?.amount ?? '',
      t.credit_debit_indicator ?? '',
      (t.remittance_information ?? []).join(' '),
      t.creditor?.name ?? t.debtor?.name ?? '',
    ].join('|')
    return 'eb_' + createHash('sha1').update(basis).digest('hex')
  }

  static txnAmount(t: EbTransaction): number {
    return Math.abs(Number(t.transaction_amount?.amount ?? 0)) || 0
  }

  static txnDirection(t: EbTransaction): 'credit' | 'debit' {
    return t.credit_debit_indicator === 'CRDT' ? 'credit' : 'debit'
  }

  static txnBookedAt(t: EbTransaction): Date {
    return new Date(t.booking_date ?? t.value_date ?? t.transaction_date ?? Date.now())
  }

  static txnDescription(t: EbTransaction): string | null {
    const remittance = (t.remittance_information ?? []).filter(Boolean).join(' ').trim()
    if (remittance) return remittance
    return t.bank_transaction_code?.description ?? null
  }

  static txnCounterparty(t: EbTransaction): string | null {
    const party = EnableBankingService.txnDirection(t) === 'credit' ? t.debtor : t.creditor
    return party?.name ?? null
  }

  static accountName(a: EbAccount): string {
    return a.name ?? a.product ?? 'Account'
  }

  static accountType(a: EbAccount): 'current' | 'savings' | 'credit_card' | 'business' {
    const t = `${a.cash_account_type ?? ''} ${a.product ?? ''} ${a.usage ?? ''}`.toLowerCase()
    if (t.includes('svgs') || t.includes('saving')) return 'savings'
    if (t.includes('card') || t.includes('credit')) return 'credit_card'
    if (a.usage === 'ORGA' || t.includes('business')) return 'business'
    return 'current'
  }
}
