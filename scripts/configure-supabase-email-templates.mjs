/**
 * Patch Supabase Auth email templates so links hit /auth/callback with token_hash.
 * Avoids PKCE-only {{ .ConfirmationURL }} flows that break when the reset link is
 * opened outside the browser that requested it.
 *
 * Requires SUPABASE_ACCESS_TOKEN — https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   node scripts/configure-supabase-email-templates.mjs
 */

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || 'wlqrfbczvtumfqctykem'

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)')
  process.exit(1)
}

const recoveryContent = `<h2>Reset your password</h2>
<p>We received a request to reset your password. Follow the link below to choose a new one.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=%2Fauth%2Fupdate-password">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>`

const confirmationContent = `<h2>Confirm your email</h2>
<p>Follow the link below to confirm your email address and finish signing up.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm email</a></p>`

const payload = {
  mailer_subjects_recovery: 'Reset your password',
  mailer_templates_recovery_content: recoveryContent,
  mailer_subjects_confirmation: 'Confirm your email',
  mailer_templates_confirmation_content: confirmationContent,
}

const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`

console.log(`Updating Auth email templates for project ${projectRef}…`)

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

console.log('Done. Recovery + signup emails now link directly to /auth/callback with token_hash.')
console.log('Ensure Site URL is https://support.belowthefold.gr (Authentication → URL configuration).')
console.log('Request a fresh reset email — old links still use the previous template.')
