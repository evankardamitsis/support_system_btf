type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
}

type Sender = { name: string; email: string }

function parseSender(from: string): Sender {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: 'BTF Support', email: from.trim() }
}

function zeptoAuthHeader(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (trimmed.toLowerCase().startsWith('zoho-enczapikey')) return trimmed
  return `Zoho-enczapikey ${trimmed}`
}

/** ZeptoMail (Zoho) — free tier: 10,000 emails/month */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
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

  const res = await fetch('https://api.zeptomail.com/v1.1/email', {
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
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[email] ZeptoMail send failed:', res.status, body)
    return false
  }

  return true
}
