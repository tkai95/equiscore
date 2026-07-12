import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface InvitationEmailDelivery {
  attempted: boolean
  sent: boolean
  provider: 'resend' | 'none'
  reason?: string
  messageId?: string
}

interface InvitationEmailInput {
  to: string
  subject: string
  heading: string
  preview: string
  intro: string
  ctaLabel: string
  ctaUrl: string
  details: Array<{ label: string; value: string }>
}

@Injectable()
export class InvitationEmailService {
  private readonly logger = new Logger(InvitationEmailService.name)

  constructor(private readonly config: ConfigService) {}

  async sendInvitation(input: InvitationEmailInput): Promise<InvitationEmailDelivery> {
    const apiKey = this.configValue('RESEND_API_KEY')
    const from =
      this.configValue('INVITE_EMAIL_FROM') ??
      this.configValue('RESEND_FROM_EMAIL') ??
      this.configValue('EMAIL_FROM')

    if (!apiKey || !from) {
      this.logger.warn(
        `Invitation email not sent to ${input.to}: RESEND_API_KEY and invite sender are not configured`
      )
      return {
        attempted: false,
        sent: false,
        provider: 'none',
        reason: 'Email delivery is not configured',
      }
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: input.to,
          subject: input.subject,
          html: this.renderHtml(input),
          text: this.renderText(input),
        }),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        this.logger.error(
          `Invitation email failed for ${input.to}: Resend returned ${response.status} ${body.slice(
            0,
            300
          )}`
        )
        return {
          attempted: true,
          sent: false,
          provider: 'resend',
          reason: `Email provider returned ${response.status}`,
        }
      }

      const data = (await response.json().catch(() => ({}))) as { id?: string }
      return {
        attempted: true,
        sent: true,
        provider: 'resend',
        messageId: data.id,
      }
    } catch (error) {
      this.logger.error(
        `Invitation email failed for ${input.to}`,
        error instanceof Error ? error.stack : String(error)
      )
      return {
        attempted: true,
        sent: false,
        provider: 'resend',
        reason: 'Email provider request failed',
      }
    }
  }

  private configValue(key: string): string | null {
    const value = this.config.get<string>(key)?.trim()
    return value || null
  }

  private renderHtml(input: InvitationEmailInput): string {
    const details = input.details
      .map(
        (detail) => `
          <tr>
            <td style="padding: 8px 0; color: #66736f; font-size: 14px;">${this.escape(
              detail.label
            )}</td>
            <td style="padding: 8px 0; color: #10231d; font-size: 14px; font-weight: 600; text-align: right;">${this.escape(
              detail.value
            )}</td>
          </tr>`
      )
      .join('')

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escape(input.subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #f6f7f3; font-family: Arial, sans-serif; color: #10231d;">
    <div style="display: none; max-height: 0; overflow: hidden;">${this.escape(input.preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f6f7f3; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background: #ffffff; border: 1px solid #dfe5df; border-radius: 14px; overflow: hidden;">
            <tr>
              <td style="padding: 28px 28px 18px;">
                <p style="margin: 0 0 18px; color: #0b4c3d; font-size: 20px; font-weight: 700;">EquiScore</p>
                <h1 style="margin: 0; color: #10231d; font-size: 24px; line-height: 1.25;">${this.escape(
                  input.heading
                )}</h1>
                <p style="margin: 12px 0 0; color: #52615d; font-size: 15px; line-height: 1.55;">${this.escape(
                  input.intro
                )}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 22px;">
                <a href="${this.escapeAttribute(
                  input.ctaUrl
                )}" style="display: inline-block; background: #064638; color: #fffdf5; text-decoration: none; border-radius: 8px; padding: 12px 18px; font-size: 14px; font-weight: 700;">${this.escape(
                  input.ctaLabel
                )}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e6ebe5; border-bottom: 1px solid #e6ebe5;">
                  ${details}
                </table>
                <p style="margin: 18px 0 0; color: #66736f; font-size: 13px; line-height: 1.5;">This invitation is tied to ${this.escape(
                  input.to
                )}. If you were not expecting this, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  }

  private renderText(input: InvitationEmailInput): string {
    const details = input.details.map((detail) => `${detail.label}: ${detail.value}`).join('\n')

    return [
      'EquiScore',
      '',
      input.heading,
      '',
      input.intro,
      '',
      `${input.ctaLabel}: ${input.ctaUrl}`,
      '',
      details,
      '',
      `This invitation is tied to ${input.to}. If you were not expecting this, you can ignore this email.`,
    ].join('\n')
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private escapeAttribute(value: string): string {
    return this.escape(value).replace(/`/g, '&#96;')
  }
}
