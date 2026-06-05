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
    </div>
  `
}

export type ClientTeamInviteEmailResult = { sent: true } | { sent: false; error: string }

export async function sendClientTeamInviteEmail(input: {
  to: string
  inviteeName: string
  clientName: string
  invitedByName?: string | null
  inviteUrl: string
}): Promise<ClientTeamInviteEmailResult> {
  const inviter = input.invitedByName?.trim()
  const intro = inviter
    ? `<strong>${inviter}</strong> invited you to join the support portal for <strong>${input.clientName}</strong>.`
    : `You've been invited to join the support portal for <strong>${input.clientName}</strong>.`

  const sent = await sendEmail({
    to: input.to,
    subject: `Join ${input.clientName} on BTF Support`,
    html: emailShell(
      `Hi ${input.inviteeName}`,
      `${intro} Create your account to view tickets and your support plan. This link expires in 7 days.`,
      'Accept invite',
      input.inviteUrl
    ),
  })

  if (!sent) {
    return {
      sent: false,
      error:
        'Invite was created but the email could not be sent. Check ZEPTOMAIL_API_KEY, ZEPTOMAIL_API_URL, and EMAIL_FROM.',
    }
  }

  return { sent: true }
}
