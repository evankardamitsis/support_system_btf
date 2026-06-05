import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { formatTicketId } from '@/lib/tickets/display'
import { formatTicketPriority } from '@/lib/notify'
import { sendEmail } from '@/lib/email/send'

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

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

async function emailsForClientUsers(clientId: string): Promise<string[]> {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) return []

  const { data: profiles } = await adminResult.client
    .from('users')
    .select('id')
    .eq('client_id', clientId)
    .eq('role', 'client')

  const emails: string[] = []
  for (const profile of profiles ?? []) {
    const { data } = await adminResult.client.auth.admin.getUserById(profile.id)
    if (data?.user?.email) emails.push(data.user.email)
  }
  return emails
}

async function emailsForStaff(): Promise<string[]> {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) return []

  const { data: profiles } = await adminResult.client
    .from('users')
    .select('id')
    .in('role', ['admin', 'agent'])

  const emails: string[] = []
  for (const profile of profiles ?? []) {
    const { data } = await adminResult.client.auth.admin.getUserById(profile.id)
    if (data?.user?.email) emails.push(data.user.email)
  }
  return [...new Set(emails)]
}

export async function notifyClientEstimatePending(input: {
  ticketId: string
  ticketTitle: string
  clientId: string
  estimatedHours: number
  priority: string
}): Promise<void> {
  const recipients = await emailsForClientUsers(input.clientId)
  if (!recipients.length) return

  const url = `${appOrigin()}/portal/tickets/${input.ticketId}`
  const hours = input.estimatedHours.toFixed(2).replace(/\.00$/, '')
  const priority = formatTicketPriority(input.priority)

  await sendEmail({
    to: recipients,
    subject: `Approve estimate for ${formatTicketId(input.ticketId)}`,
    html: emailShell(
      'Review BTF estimate',
      `BTF has estimated <strong>${hours}h</strong> at <strong>${priority}</strong> priority for <strong>${input.ticketTitle}</strong>. Open your portal to approve before work continues.`,
      'Review & approve',
      url
    ),
  })
}

export async function notifyStaffEstimateApproved(input: {
  ticketId: string
  ticketTitle: string
  estimatedHours: number
  priority: string
}): Promise<void> {
  const recipients = await emailsForStaff()
  if (!recipients.length) return

  const url = `${appOrigin()}/admin/tickets/${input.ticketId}`
  const hours = input.estimatedHours.toFixed(2).replace(/\.00$/, '')
  const priority = formatTicketPriority(input.priority)

  await sendEmail({
    to: recipients,
    subject: `Estimate approved — ${formatTicketId(input.ticketId)}`,
    html: emailShell(
      'Ticket estimate approved',
      `The client approved <strong>${hours}h</strong> at <strong>${priority}</strong> priority for <strong>${input.ticketTitle}</strong>. You can resolve and log actual hours when work is done.`,
      'Open ticket',
      url
    ),
  })
}
