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

const ZEPTO_PREFIX = /^zoho-enczapikey\s+/i

function parseSender(from: string): Sender {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: 'BTF Support', email: from.trim() }
}

/** Strip wrapper quotes / duplicate Zoho-enczapikey prefix — env should hold token only or full header value */
function normalizeZeptoToken(raw: string): string {
  let token = raw.trim().replace(/^['"]|['"]$/g, '')
  while (ZEPTO_PREFIX.test(token)) {
    token = token.replace(ZEPTO_PREFIX, '').trim()
  }
  return token
}

function zeptoAuthHeader(apiKey: string): string {
  return `Zoho-enczapikey ${normalizeZeptoToken(apiKey)}`
}

function zeptoApiBase(): string {
  const base = process.env.ZEPTOMAIL_API_URL?.trim().replace(/\/$/, '')
  return base || 'https://api.zeptomail.com'
}

function parseZeptoFailure(status: number, bodyText: string): string {
  try {
    const data = JSON.parse(bodyText) as {
      error?: {
        message?: string
        details?: Array<{ code?: string; message?: string; target?: string }>
      }
    }
    const details = data.error?.details ?? []
    const recipientIssue = details.some(
      detail =>
        detail.code === 'SM_113' ||
        detail.code === 'SMI_116' ||
        detail.target?.includes('to') ||
        detail.target?.includes('cc') ||
        detail.target?.includes('bcc')
    )
    if (recipientIssue) {
      return 'Invalid recipient email address. Check the client email and try again.'
    }
  } catch {
    // fall through to status-based message
  }

  if (status === 401) {
    return (
      'Email provider rejected the request (401). Use the Send Mail Token from Agent → SMTP/API ' +
      '(not the SMTP password). EU accounts need ZEPTOMAIL_API_URL=https://api.zeptomail.eu.'
    )
  }

  return `Email could not be sent (ZeptoMail ${status}).`
}

/** ZeptoMail (Zoho) — free tier: 10,000 emails/month */
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.ZEPTOMAIL_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey) {
    console.warn('[email] ZEPTOMAIL_API_KEY not set — skipping:', subject)
    return { ok: false, error: 'ZEPTOMAIL_API_KEY is not configured.' }
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

  const recipients = addresses.map(email => ({
    email_address: { address: email },
  }))

  const url = `${zeptoApiBase()}/v1.1/email`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: zeptoAuthHeader(apiKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      from: { address: senderEmail, name: sender.name },
      to: recipients,
      subject,
      htmlbody: html,
      ...(attachments?.length
        ? {
            attachments: attachments.map(file => ({
              name: file.name,
              content: Buffer.from(file.content).toString('base64'),
              mime_type: file.mimeType,
            })),
          }
        : {}),
    }),
  })

  const bodyText = await res.text().catch(() => '')

  if (!res.ok) {
    const error = parseZeptoFailure(res.status, bodyText)
    console.error('[email] ZeptoMail send failed:', res.status, bodyText, { endpoint: url })
    return { ok: false, error }
  }

  try {
    const data = JSON.parse(bodyText) as { request_id?: string }
    console.info('[email] ZeptoMail sent:', subject, data.request_id ?? 'ok')
  } catch {
    console.info('[email] ZeptoMail sent:', subject)
  }

  return { ok: true }
}
