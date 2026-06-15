import { sendEmail } from '@/lib/email/send'

function emailShell(title: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#111">
      <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#666">BTF Support</p>
      <h1 style="font-size:20px;font-weight:600;margin:16px 0 8px">${title}</h1>
      <p style="font-size:15px;line-height:1.6;color:#333">${body}</p>
      <p style="margin:24px 0">
        <a href="${ctaUrl}" style="display:inline-block;background:#0e0e0e;color:#e8ff47;padding:12px 20px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase">${ctaLabel}</a>
      </p>
      <p style="font-size:13px;line-height:1.5;color:#666">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `
}

export type PasswordRecoveryEmailResult = { sent: true } | { sent: false; error: string }

export async function sendPasswordRecoveryEmail(input: {
  to: string
  resetUrl: string
}): Promise<PasswordRecoveryEmailResult> {
  const sent = await sendEmail({
    to: input.to,
    subject: 'Reset your BTF Support password',
    html: emailShell(
      'Reset your password',
      'We received a request to reset your password. Follow the link below to choose a new one. This link expires after a short time.',
      'Reset password',
      input.resetUrl
    ),
  })

  if (!sent.ok) {
    return { sent: false, error: sent.error }
  }

  return { sent: true }
}
