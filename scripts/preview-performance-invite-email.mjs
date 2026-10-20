/**
 * Preview the Performance HQ dashboard invite email.
 *
 * Writes the rendered HTML to .preview/performance-invite.html. With --to, also sends it
 * through Resend (needs RESEND_API_KEY and EMAIL_FROM). No invite token is created —
 * the CTA points at a placeholder link.
 *
 * Usage:
 *   node scripts/preview-performance-invite-email.mjs [--existing]
 *   RESEND_API_KEY=re_... node --env-file=.env.local scripts/preview-performance-invite-email.mjs --to you@example.com
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const jiti = createJiti(import.meta.url, { alias: { '@': root } })

const { buildPerformanceDashboardInviteEmail } = await jiti.import('@/lib/email/performance-dashboard-invite')
const { sendEmail } = await jiti.import('@/lib/email/send')

const args = process.argv.slice(2)
const toIndex = args.indexOf('--to')
const to = toIndex >= 0 ? args[toIndex + 1] : null
const existingUser = args.includes('--existing')
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://support.belowthefold.gr'

const email = buildPerformanceDashboardInviteEmail({
  to: to ?? 'preview@example.com',
  inviteeName: 'Preview Client',
  clientName: 'Preview Client',
  inviteUrl: existingUser
    ? `${appUrl}/auth/login`
    : `${appUrl}/auth/register-client?token=preview-not-a-real-token`,
  existingUser,
})

const outFile = resolve(root, '.preview/performance-invite.html')
mkdirSync(dirname(outFile), { recursive: true })
// Local preview inlines the logo so it renders before the asset is deployed
const logoDataUri = `data:image/png;base64,${readFileSync(resolve(root, 'public/email/btf-logo.png')).toString('base64')}`
const localHtml = email.html.replaceAll('https://support.belowthefold.gr/email/btf-logo.png', logoDataUri)
writeFileSync(outFile, `<!doctype html><meta charset="utf-8"><title>${email.subject}</title>${localHtml}`)
console.log(`Subject: ${email.subject}`)
console.log(`Wrote ${outFile}`)

if (to) {
  const result = await sendEmail({ to, subject: `[Preview] ${email.subject}`, html: email.html })
  if (!result.ok) {
    console.error('Send failed:', result.error)
    process.exit(1)
  }
  console.log(`Sent preview to ${to}`)
}
