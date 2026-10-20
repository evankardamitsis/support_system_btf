/**
 * Patch Supabase Auth email templates so links hit /auth/callback with token_hash.
 * Avoids PKCE-only {{ .ConfirmationURL }} flows that break when the reset link is
 * opened outside the browser that requested it.
 *
 * Templates use the same branded layout (logo + footer) as app emails (lib/email/email-shell.ts).
 *
 * Requires SUPABASE_ACCESS_TOKEN — https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   node scripts/configure-supabase-email-templates.mjs
 *   node scripts/configure-supabase-email-templates.mjs --print   # write HTML to .preview/ to paste in the dashboard
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const jiti = createJiti(import.meta.url, { alias: { '@': root } })
const { emailShell } = await jiti.import('@/lib/email/email-shell')

const recoveryContent = emailShell(
  'Reset your password',
  "We received a request to reset your password. Follow the link below to choose a new one.<br><br>If you didn't request this, you can safely ignore this email.",
  'Reset password',
  '{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=%2Fauth%2Fupdate-password'
)

const confirmationContent = emailShell(
  'Confirm your email',
  'Follow the link below to confirm your email address and finish signing up.',
  'Confirm email',
  '{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup'
)

if (process.argv.includes('--print')) {
  const outDir = resolve(root, '.preview')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, 'supabase-recovery.html'), recoveryContent)
  writeFileSync(resolve(outDir, 'supabase-confirmation.html'), confirmationContent)
  console.log(`Wrote ${outDir}/supabase-recovery.html and supabase-confirmation.html`)
  process.exit(0)
}

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || 'wlqrfbczvtumfqctykem'

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)')
  process.exit(1)
}

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
