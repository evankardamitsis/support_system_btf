import { emailShell, type PortalEmailResult } from '@/lib/email/email-shell'
import { sendEmail } from '@/lib/email/send'

export type ClientTeamInviteEmailResult = PortalEmailResult

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

  if (!sent.ok) {
    return {
      sent: false,
      error:
        sent.error ||
        'Invite was created but the email could not be sent. Check ZEPTOMAIL_API_KEY, ZEPTOMAIL_API_URL, and EMAIL_FROM.',
    }
  }

  return { sent: true }
}
