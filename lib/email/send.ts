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

/** Brevo (Sendinblue) — free tier: 300 emails/day */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY not set — skipping:', subject)
    return false
  }
  if (!from) {
    console.warn('[email] EMAIL_FROM not set — skipping:', subject)
    return false
  }

  const sender = parseSender(from)
  const recipients = (Array.isArray(to) ? to : [to]).map(email => ({ email }))

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: recipients,
      subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[email] Brevo send failed:', res.status, body)
    return false
  }

  return true
}
