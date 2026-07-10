import Anthropic from '@anthropic-ai/sdk'
import type { DocumentType } from '@equiscore/shared'
import { documentFamily, type ExtractedFields } from './document-claims'

/**
 * Read an uploaded evidence document (photo ID, address proof, payslip…) into
 * structured fields with Claude vision / native PDF. This is the extraction
 * boundary only — the AI turns pixels into fields; the deterministic matcher in
 * document-claims.ts decides whether those fields corroborate the profile, and
 * the scorer decides what they're worth. Nothing here awards a score.
 *
 * The model is asked to be conservative: report only what it can actually read,
 * flag whether the file genuinely looks like a document of the claimed kind, and
 * never invent a name, date, or address.
 */

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function familyGuidance(type: DocumentType): string {
  switch (documentFamily(type)) {
    case 'identity':
      return 'This should be a government photo ID. The most important fields are the full legal name, date of birth, document number, and expiry date.'
    case 'address':
      return 'This should be proof of address (a bill, statement, or tenancy). The most important fields are the full name and the residential address including postcode, plus the document date.'
    case 'income':
      return 'This should evidence income/employment (a payslip, P60, P45, employment letter, or tax return). The most important fields are the employee name, employer name, pay date, and gross/net pay amounts.'
    default:
      return 'Extract whatever identifying fields are present.'
  }
}

function buildPrompt(type: DocumentType): string {
  return `You are extracting fields from an uploaded UK "${type}" document (an image or PDF).

${familyGuidance(type)}

Return ONLY a JSON object, no markdown, no commentary, in exactly this shape:
{
  "detectedDocumentType": string | null,   // what kind of document this actually appears to be
  "looksAuthentic": boolean,               // true only if this is a genuine, complete document of a recognised kind (NOT a blank template, a selfie, a random photo, or an unrelated screenshot)
  "readable": boolean,                     // true if the key fields could be read; false if too blurry/cropped/dark
  "fullName": string | null,               // the person's full name as printed
  "dateOfBirth": "YYYY-MM-DD" | null,
  "address": string | null,                // full residential address as one line, if present
  "postcode": string | null,               // UK postcode, if present
  "documentNumber": string | null,         // passport/licence/BRP number, if present
  "expiryDate": "YYYY-MM-DD" | null,
  "employerName": string | null,           // for payslips / employment documents
  "payDate": "YYYY-MM-DD" | null,
  "netPay": number | null,                 // take-home amount on a payslip, plain number
  "grossPay": number | null                // gross amount on a payslip, plain number
}

Rules:
- Only report a field you can actually read on the document. If it is not present or not legible, use null. NEVER guess or infer a value.
- Convert any date to ISO YYYY-MM-DD.
- For amounts, output a plain number with no currency symbol or commas.
- Set "looksAuthentic": false if the file is clearly not the kind of document expected (e.g. a selfie, a blank form, or unrelated content).
- Output only the JSON object.`
}

function extractJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) throw new Error('No JSON object found in model output')
  return text.slice(start, end + 1)
}

function toNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
function toStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

export async function extractDocumentFields(
  apiKey: string,
  base64: string,
  mimeType: string,
  documentType: DocumentType
): Promise<ExtractedFields> {
  const client = new Anthropic({ apiKey })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90 * 1000)

  const source =
    mimeType === 'application/pdf'
      ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as const)
      : IMAGE_TYPES.has(mimeType)
        ? ({
            type: 'image',
            source: { type: 'base64', media_type: mimeType as 'image/jpeg', data: base64 },
          } as const)
        : null

  if (!source) {
    // A type we can't hand to the model (unlikely — uploads are pdf/image).
    return unreadable()
  }

  let message
  try {
    const stream = client.messages.stream(
      {
        model: 'claude-sonnet-5',
        max_tokens: 1500,
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: [source, { type: 'text', text: buildPrompt(documentType) }] }],
      },
      { signal: controller.signal }
    )
    message = await stream.finalMessage()
  } catch {
    return unreadable()
  } finally {
    clearTimeout(timeout)
  }

  if (message.stop_reason === 'refusal') return unreadable()

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  let p: Record<string, unknown>
  try {
    p = JSON.parse(extractJson(text)) as Record<string, unknown>
  } catch {
    return unreadable()
  }

  return {
    detectedDocumentType: toStr(p.detectedDocumentType),
    looksAuthentic: p.looksAuthentic === true,
    readable: p.readable === true,
    fullName: toStr(p.fullName),
    dateOfBirth: toStr(p.dateOfBirth),
    address: toStr(p.address),
    postcode: toStr(p.postcode),
    documentNumber: toStr(p.documentNumber),
    expiryDate: toStr(p.expiryDate),
    employerName: toStr(p.employerName),
    payDate: toStr(p.payDate),
    netPay: toNumber(p.netPay),
    grossPay: toNumber(p.grossPay),
  }
}

function unreadable(): ExtractedFields {
  return {
    detectedDocumentType: null,
    looksAuthentic: false,
    readable: false,
    fullName: null,
    dateOfBirth: null,
    address: null,
    postcode: null,
    documentNumber: null,
    expiryDate: null,
    employerName: null,
    payDate: null,
    netPay: null,
    grossPay: null,
  }
}
