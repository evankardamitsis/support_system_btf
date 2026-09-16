import { emailShell, type PortalEmailResult } from '@/lib/email/email-shell'
import { sendEmail } from '@/lib/email/send'

export async function sendPerformanceDashboardInviteEmail(input: {
  to: string
  inviteeName: string
  clientName: string
  inviteUrl: string
  existingUser?: boolean
}): Promise<PortalEmailResult> {
  const body = input.existingUser
    ? `Your read-only Performance HQ access for <strong>${input.clientName}</strong> is ready. Sign in to view this dashboard only.`
    : `You've been invited to the read-only Performance HQ for <strong>${input.clientName}</strong>. Create your password to view this dashboard only. This link expires in 7 days.`
  const sent = await sendEmail({
    to: input.to,
    subject: `Your Performance HQ access — ${input.clientName}`,
    html: emailShell(
      `Hi ${input.inviteeName}`,
      body,
      input.existingUser ? 'Open dashboard' : 'Accept dashboard invite',
      input.inviteUrl
    ),
  })

  return sent.ok
    ? { sent: true }
    : { sent: false, error: sent.error || 'The dashboard invite email could not be sent.' }
}
