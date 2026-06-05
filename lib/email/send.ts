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

/** ZeptoMail (Zoho) — free tier: 10,000 emails/month */
export async function sendEmail({ to, subject, html, attachments }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.ZEPTOMAIL_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey) {
    console.warn('[email] ZEPTOMAIL_API_KEY not set — skipping:', subject)
    return false
  }
  if (!from) {
    console.warn('[email] EMAIL_FROM not set — skipping:', subject)
    return false
  }

  const sender = parseSender(from)
  const recipients = (Array.isArray(to) ? to : [to]).map(email => ({
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
      from: { address: sender.email, name: sender.name },
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
    console.error('[email] ZeptoMail send failed:', res.status, bodyText, { endpoint: url })
    if (res.status === 401) {
      console.error(
        '[email] Zepto 401: use the Send Mail Token from Agent → SMTP/API (not SMTP password). ' +
          'EU accounts need ZEPTOMAIL_API_URL=https://api.zeptomail.eu'
      )
    }
    return false
  }

  try {
    const data = JSON.parse(bodyText) as { request_id?: string }
    console.info('[email] ZeptoMail sent:', subject, data.request_id ?? 'ok')
  } catch {
    console.info('[email] ZeptoMail sent:', subject)
  }

  return true
}
