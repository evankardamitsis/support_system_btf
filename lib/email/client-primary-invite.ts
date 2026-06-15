import { emailShell, type PortalEmailResult } from '@/lib/email/email-shell'
import { sendEmail } from '@/lib/email/send'

export async function sendClientPrimaryInviteEmail(input: {
  to: string
  contactName: string | null
  clientName: string
  inviteUrl: string
}): Promise<PortalEmailResult> {
  const greeting = input.contactName?.trim() || 'there'
  const sent = await sendEmail({
    to: input.to,
    subject: `Your BTF Support portal invite — ${input.clientName}`,
    html: emailShell(
      `Hi ${greeting}`,
      `You've been invited to set up the BTF Support portal for <strong>${input.clientName}</strong>. Create your password to view tickets, approvals, and your support plan. This link expires in 7 days.`,
      'Set up portal access',
      input.inviteUrl
    ),
  })

  if (!sent.ok) {
    return {
      sent: false,
      error:
        sent.error ||
        'Invite link was created but the email could not be sent. Check ZEPTOMAIL_API_KEY, ZEPTOMAIL_API_URL, and EMAIL_FROM.',
    }
  }

  return { sent: true }
}
