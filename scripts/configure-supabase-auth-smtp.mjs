/**
 * Configure Supabase Auth to send via Resend SMTP (signup, reset, confirm).
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN — https://supabase.com/dashboard/account/tokens
 *   RESEND_API_KEY — Resend → API Keys (used as the SMTP password)
 *
 * Optional (from .env.local):
 *   EMAIL_FROM, SUPABASE_PROJECT_REF, AUTH_EMAIL_RATE_LIMIT
 *
 * Usage:
 *   node --env-file=.env.local scripts/configure-supabase-auth-smtp.mjs
 */

function parseSenderEmail(from) {
  const raw = (from ?? '').trim()
  const match = raw.match(/<([^>]+)>/)
  const email = (match ? match[1] : raw).trim().toLowerCase()
  if (!email.includes('@')) {
    throw new Error('EMAIL_FROM must be set (e.g. BTF Support <support@belowthefold.gr>)')
  }
  return email
}

function parseSenderName(from) {
  const raw = (from ?? '').trim()
  const match = raw.match(/^(.+?)\s*</)
  return match ? match[1].trim() : 'BTF Support'
}

const SMTP_HOST = 'smtp.resend.com'
const SMTP_PORT = 465

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || 'wlqrfbczvtumfqctykem'
const smtpPassword = process.env.RESEND_API_KEY?.trim()
const senderEmail = parseSenderEmail(process.env.EMAIL_FROM)
const senderName = parseSenderName(process.env.EMAIL_FROM)
const emailRateLimit = Number(process.env.AUTH_EMAIL_RATE_LIMIT ?? '100')

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)')
  process.exit(1)
}

if (!smtpPassword) {
  console.error('Missing RESEND_API_KEY (Resend → API Keys)')
  process.exit(1)
}

if (!Number.isFinite(emailRateLimit) || emailRateLimit < 1) {
  console.error('AUTH_EMAIL_RATE_LIMIT must be a positive number')
  process.exit(1)
}

const payload = {
  external_email_enabled: true,
  mailer_secure_email_change_enabled: true,
  mailer_autoconfirm: false,
  smtp_admin_email: senderEmail,
  smtp_host: SMTP_HOST,
  smtp_port: SMTP_PORT,
  smtp_user: 'resend',
  smtp_pass: smtpPassword,
  smtp_sender_name: senderName,
  rate_limit_email_sent: emailRateLimit,
}

const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`

console.log(`Configuring Auth SMTP for project ${projectRef}…`)
console.log(`  Host: ${SMTP_HOST}:${SMTP_PORT}`)
console.log(`  From: ${senderName} <${senderEmail}>`)
console.log(`  Email rate limit: ${emailRateLimit}/hour`)

const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})

const bodyText = await res.text()
if (!res.ok) {
  console.error('Failed:', res.status, bodyText)
  process.exit(1)
}

console.log('Done. Auth emails (signup, reset, confirm) now use Resend SMTP.')
console.log('See supabase/auth-smtp.md for dashboard checks and troubleshooting.')
