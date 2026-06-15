import { emailShell, type PortalEmailResult } from '@/lib/email/email-shell'
import { sendEmail } from '@/lib/email/send'
import { formatStaffRole } from '@/lib/team/roles'
import type { StaffRole } from '@/lib/team/roles'

export async function sendStaffInviteEmail(input: {
  to: string
  inviteeName: string
  role: StaffRole
  inviteUrl: string
}): Promise<PortalEmailResult> {
  const roleLabel = formatStaffRole(input.role)
  const sent = await sendEmail({
    to: input.to,
    subject: `Join BTF Support as ${roleLabel}`,
    html: emailShell(
      `Hi ${input.inviteeName}`,
      `You've been invited to join the BTF Support team as <strong>${roleLabel}</strong>. Create your account to manage tickets and clients. This link expires in 7 days.`,
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
