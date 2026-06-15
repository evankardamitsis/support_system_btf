/**
 * Configure Supabase Auth to send via ZeptoMail SMTP (signup, reset, confirm).
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN — https://supabase.com/dashboard/account/tokens
 *   ZEPTOMAIL_SMTP_PASSWORD — Mail Agent → SMTP tab (NOT ZEPTOMAIL_API_KEY)
 *
 * Optional (from .env.local):
 *   EMAIL_FROM, ZEPTOMAIL_API_URL, SUPABASE_PROJECT_REF, AUTH_EMAIL_RATE_LIMIT
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

function smtpHost() {
  const apiUrl = process.env.ZEPTOMAIL_API_URL?.toLowerCase() ?? ''
  return apiUrl.includes('.eu') ? 'smtp.zeptomail.eu' : 'smtp.zeptomail.com'
}

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || 'wlqrfbczvtumfqctykem'
const smtpPassword = process.env.ZEPTOMAIL_SMTP_PASSWORD?.trim()
const senderEmail = parseSenderEmail(process.env.EMAIL_FROM)
const senderName = parseSenderName(process.env.EMAIL_FROM)
const emailRateLimit = Number(process.env.AUTH_EMAIL_RATE_LIMIT ?? '100')

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)')
  process.exit(1)
}

if (!smtpPassword) {
  console.error('Missing ZEPTOMAIL_SMTP_PASSWORD (ZeptoMail Agent → SMTP tab, not the API key)')
  process.exit(1)
}

if (!Number.isFinite(emailRateLimit) || emailRateLimit < 1) {
  console.error('AUTH_EMAIL_RATE_LIMIT must be a positive number')
  process.exit(1)
}

const host = smtpHost()
const payload = {
  external_email_enabled: true,
  mailer_secure_email_change_enabled: true,
  mailer_autoconfirm: false,
  smtp_admin_email: senderEmail,
  smtp_host: host,
  smtp_port: 587,
  smtp_user: 'emailapikey',
  smtp_pass: smtpPassword,
  smtp_sender_name: senderName,
  rate_limit_email_sent: emailRateLimit,
}

const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`

console.log(`Configuring Auth SMTP for project ${projectRef}…`)
console.log(`  Host: ${host}:587`)
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

console.log('Done. Auth emails (signup, reset, confirm) now use ZeptoMail SMTP.')
console.log('See supabase/auth-smtp.md for dashboard checks and troubleshooting.')
