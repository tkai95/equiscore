import { NextResponse } from 'next/server'
import { Pool } from 'pg'

let pool: Pool | null = null
// Email clients (Gmail, Outlook, Yahoo) refuse to render <img src="*.svg"> —
// they download but won't paint it, so the SVG shows as a broken image. PNG is
// universally supported in email, so the branded header points at the PNG
// wordmark instead of the SVG asset used on the website.
const DEFAULT_EMAIL_LOGO_URL = 'https://www.equiscore.app/logo.png'

type WaitlistPayload = {
  email?: string
  profileType?: 'individual' | 'business'
  useCase?: string | string[]
  currentCountry?: string
  lastCountry?: string
  orgType?: string
  intendedUse?: string | string[]
  applicantVolume?: string
  problem?: string
  consent?: boolean
}

type EmailDelivery = {
  attempted: boolean
  sent: boolean
  reason?: string
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  }
  return pool
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL is not set' }, { status: 503 })
  }

  try {
    const body = (await req.json()) as WaitlistPayload
    const {
      email,
      profileType,
      useCase,
      currentCountry,
      lastCountry,
      orgType,
      intendedUse,
      applicantVolume,
      problem,
      consent,
    } = body
    const normalisedEmail = email?.trim().toLowerCase()

    if (!normalisedEmail || !profileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await getPool().query(
      `INSERT INTO waitlist_entries
        (id, email, profile_type, use_case, current_country, last_country, org_type, intended_use, applicant_volume, problem_statement, consent)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO UPDATE SET
        profile_type     = EXCLUDED.profile_type,
        use_case         = EXCLUDED.use_case,
        current_country  = EXCLUDED.current_country,
        last_country     = EXCLUDED.last_country,
        org_type         = EXCLUDED.org_type,
        intended_use     = EXCLUDED.intended_use,
        applicant_volume = EXCLUDED.applicant_volume,
        problem_statement = EXCLUDED.problem_statement,
        consent          = EXCLUDED.consent`,
      [
        normalisedEmail,
        profileType,
        normaliseList(useCase),
        normaliseOptionalString(currentCountry),
        normaliseOptionalString(lastCountry),
        normaliseOptionalString(orgType),
        normaliseList(intendedUse),
        normaliseOptionalString(applicantVolume),
        normaliseOptionalString(problem),
        consent === true,
      ]
    )

    const delivery = await sendWaitlistConfirmation(normalisedEmail, profileType)
    if (delivery.attempted && !delivery.sent) {
      console.warn('Waitlist confirmation email was not sent:', delivery.reason)
    }

    return NextResponse.json({ success: true, confirmationEmailSent: delivery.sent })
  } catch (err) {
    console.error('Register interest error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function normaliseList(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20)
    return items.length ? items.join(', ') : null
  }
  return normaliseOptionalString(value)
}

function normaliseOptionalString(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed || null
}

async function sendWaitlistConfirmation(
  to: string,
  profileType: 'individual' | 'business'
): Promise<EmailDelivery> {
  const apiKey = configValue('RESEND_API_KEY')
  const from =
    configValue('WAITLIST_EMAIL_FROM') ??
    configValue('INVITE_EMAIL_FROM') ??
    configValue('RESEND_FROM_EMAIL') ??
    configValue('EMAIL_FROM')

  if (!apiKey || !from) {
    return {
      attempted: false,
      sent: false,
      reason: 'Email delivery is not configured',
    }
  }

  const input = waitlistEmailInput(to, profileType)

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        // A Reply-To is a positive deliverability + UX signal. Default to the
        // sender; override with EMAIL_REPLY_TO when set.
        reply_to: configValue('EMAIL_REPLY_TO') ?? from,
        subject: input.subject,
        html: renderWaitlistHtml(input),
        text: renderWaitlistText(input),
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return {
        attempted: true,
        sent: false,
        reason: `Email provider returned ${response.status}: ${body.slice(0, 160)}`,
      }
    }

    return { attempted: true, sent: true }
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      reason: error instanceof Error ? error.message : 'Email provider request failed',
    }
  }
}

function waitlistEmailInput(to: string, profileType: 'individual' | 'business') {
  const business = profileType === 'business'

  return {
    to,
    subject: business
      ? 'Thanks for joining the EquiScore partner waitlist'
      : "You're on the EquiScore waitlist",
    eyebrow: 'Waitlist confirmation',
    heading: business
      ? 'Thanks for joining the partner waitlist'
      : "You're on the EquiScore waitlist",
    preview: 'Thanks for registering your interest in EquiScore.',
    intro:
      "Thanks for registering your interest. We've saved your details and will notify you when the next access window opens.",
    body: business
      ? "We'll use your answers to understand the partner workflow that best fits your organisation."
      : "We'll keep you posted as EquiScore opens to more people building and sharing Trust Portfolios.",
    ctaLabel: 'Visit EquiScore',
    ctaUrl: consumerAppUrl(),
    surfaceLabel: business ? 'Partner waitlist' : 'Consumer waitlist',
    details: [
      { label: 'Joined as', value: business ? 'Company' : 'Individual' },
      { label: 'Status', value: 'Waitlist joined' },
      { label: 'Next step', value: 'We will notify you when access opens' },
    ],
    footerNote:
      'You are receiving this because this email address was used to join the EquiScore waitlist. If that was not you, you can ignore this message.',
  }
}

function renderWaitlistHtml(input: ReturnType<typeof waitlistEmailInput>): string {
  const logoUrl = configValue('EMAIL_LOGO_URL') ?? DEFAULT_EMAIL_LOGO_URL
  const details = input.details
    .map(
      (detail) => `
        <tr>
          <td style="padding: 10px 0; color: #66736f; font-size: 14px; border-top: 1px solid #e6ebe5;">${escapeHtml(
            detail.label
          )}</td>
          <td style="padding: 10px 0; color: #10231d; font-size: 14px; font-weight: 700; text-align: right; border-top: 1px solid #e6ebe5;">${escapeHtml(
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
    <title>${escapeHtml(input.subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #f6f7f3; font-family: Arial, Helvetica, sans-serif; color: #10231d;">
    <div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(input.preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f6f7f3; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border: 1px solid #dfe5df; border-radius: 16px; overflow: hidden;">
            <tr>
              <td style="background: #064638; padding: 22px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <table role="presentation" cellspacing="0" cellpadding="0" style="background: #fffdf5; border-radius: 14px;">
                        <tr>
                          <td style="padding: 9px 12px;">
                            <img src="${escapeAttribute(
                              logoUrl
                            )}" width="160" alt="EquiScore" style="display: block; width: 160px; max-width: 160px; height: auto; border: 0; outline: none; text-decoration: none;" />
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="color: #d6e4dc; font-size: 13px; font-weight: 700;">${escapeHtml(
                      input.surfaceLabel
                    )}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 28px 18px;">
                <p style="margin: 0 0 10px; color: #0b4c3d; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">${escapeHtml(
                  input.eyebrow
                )}</p>
                <h1 style="margin: 0; color: #10231d; font-size: 25px; line-height: 1.25;">${escapeHtml(
                  input.heading
                )}</h1>
                <p style="margin: 12px 0 0; color: #52615d; font-size: 15px; line-height: 1.55;">${escapeHtml(
                  input.intro
                )}</p>
                <p style="margin: 10px 0 0; color: #52615d; font-size: 15px; line-height: 1.55;">${escapeHtml(
                  input.body
                )}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 22px;">
                <a href="${escapeAttribute(
                  input.ctaUrl
                )}" style="display: inline-block; background: #064638; color: #fffdf5; text-decoration: none; border-radius: 9px; padding: 13px 18px; font-size: 14px; font-weight: 800;">${escapeHtml(
                  input.ctaLabel
                )}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #e6ebe5;">
                  ${details}
                </table>
                <p style="margin: 18px 0 0; color: #66736f; font-size: 13px; line-height: 1.5;">${escapeHtml(
                  input.footerNote
                )}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function renderWaitlistText(input: ReturnType<typeof waitlistEmailInput>): string {
  return [
    'EquiScore',
    '',
    input.eyebrow,
    '',
    input.heading,
    '',
    input.intro,
    '',
    input.body,
    '',
    `${input.ctaLabel}: ${input.ctaUrl}`,
    '',
    ...input.details.map((detail) => `${detail.label}: ${detail.value}`),
    '',
    input.footerNote,
  ].join('\n')
}

function consumerAppUrl(): string {
  return (
    configValue('CONSUMER_APP_URL') ??
    configValue('PUBLIC_APP_URL') ??
    firstConfiguredWebUrl() ??
    'https://equiscore.app'
  )
}

function firstConfiguredWebUrl(): string | null {
  const value = configValue('WEB_URL')
  return value?.split(',')[0]?.trim() || null
}

function configValue(key: string): string | null {
  const value = process.env[key]?.trim()
  return value || null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;')
}
