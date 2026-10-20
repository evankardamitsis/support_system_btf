import {
  isValidEmailAddress,
  normalizeEmailAddress,
  resolveRecipientAddresses,
} from '@/lib/email/addresses'

export type EmailAttachment = {
  name: string
  content: Buffer | Uint8Array
  mimeType: string
}

type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

export type SendEmailResult = { ok: true } | { ok: false; error: string }

type Sender = { name: string; email: string }

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function parseSender(from: string): Sender {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: 'BTF Support', email: from.trim() }
}

function parseResendFailure(status: number, bodyText: string): string {
  let name = ''
  let message = ''
  try {
    const data = JSON.parse(bodyText) as { name?: string; message?: string }
    name = data.name ?? ''
    message = data.message ?? ''
  } catch {
    // fall through to status-based message
  }

  if (status === 401 || name === 'missing_api_key' || name === 'invalid_api_key') {
    return 'Resend rejected the API key. Check RESEND_API_KEY.'
  }
  if (status === 403 && /domain/i.test(message)) {
    return (
      'EMAIL_FROM uses a domain that is not verified in Resend. Verify the domain under ' +
      'Resend → Domains or use a sender on a verified domain.'
    )
  }
  if (name === 'daily_quota_exceeded' || name === 'monthly_quota_exceeded') {
    return `Resend sending quota reached (${name.replace(/_/g, ' ')}). Upgrade the plan or wait for the quota to reset.`
  }
  if (status === 429) {
    return 'Resend is rate-limiting requests (429). Wait a moment and retry.'
  }
  if (name === 'validation_error' && message) {
    return `Resend rejected the email: ${message}`
  }

  return `Email could not be sent (Resend ${status}${message ? `: ${message}` : ''}).`
}

/** Resend — transactional email via REST API */
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping:', subject)
    return { ok: false, error: 'RESEND_API_KEY is not configured.' }
  }
  if (!from) {
    console.warn('[email] EMAIL_FROM not set — skipping:', subject)
    return { ok: false, error: 'EMAIL_FROM is not configured.' }
  }

  const sender = parseSender(from)
  const senderEmail = normalizeEmailAddress(sender.email)
  if (!senderEmail || !isValidEmailAddress(senderEmail)) {
    console.error('[email] EMAIL_FROM is invalid:', from)
    return {
      ok: false,
      error: 'EMAIL_FROM is not a valid sender address. Use format: Name <you@verified-domain.com>.',
    }
  }

  const addresses = resolveRecipientAddresses(to)
  if (!addresses) {
    console.error('[email] No valid recipients for:', subject, to)
    return {
      ok: false,
      error: 'No valid recipient email address. Check the client email and try again.',
    }
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      from: `${sender.name} <${senderEmail}>`,
      to: addresses,
      subject,
      html,
      ...(attachments?.length
        ? {
            attachments: attachments.map(file => ({
              filename: file.name,
              content: Buffer.from(file.content).toString('base64'),
              content_type: file.mimeType,
            })),
          }
        : {}),
    }),
  })

  const bodyText = await res.text().catch(() => '')

  if (!res.ok) {
    const error = parseResendFailure(res.status, bodyText)
    console.error('[email] Resend send failed:', res.status, bodyText)
    return { ok: false, error }
  }

  try {
    const data = JSON.parse(bodyText) as { id?: string }
    console.info('[email] Resend sent:', subject, data.id ?? 'ok')
  } catch {
    console.info('[email] Resend sent:', subject)
  }

  return { ok: true }
}
