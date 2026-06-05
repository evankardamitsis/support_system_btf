import { Resend } from 'resend'

type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'BTF Support <onboarding@resend.dev>'

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping:', subject)
    return false
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) {
    console.error('[email] send failed:', error.message)
    return false
  }
  return true
}
