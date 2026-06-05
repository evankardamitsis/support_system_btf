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

export async function getClientNotificationEmails(clientId: string): Promise<string[]> {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) return []

  const { client } = adminResult

  const found = new Set<string>()

  const { data: clientRow } = await client
    .from('clients')
    .select('email')
    .eq('id', clientId)
    .maybeSingle()

  if (clientRow?.email?.trim()) {
    found.add(clientRow.email.trim().toLowerCase())
  }

  const { data: profiles } = await client
    .from('users')
    .select('id')
    .eq('client_id', clientId)
    .eq('role', 'client')

  for (const profile of profiles ?? []) {
    const { data } = await client.auth.admin.getUserById(profile.id)
    const email = data?.user?.email?.trim()
    if (email) found.add(email.toLowerCase())
  }

  return [...found]
}

export async function getStaffNotificationEmails(): Promise<string[]> {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) return []

  const { data: profiles } = await adminResult.client
    .from('users')
    .select('id')
    .in('role', ['admin', 'agent'])

  const emails: string[] = []
  for (const profile of profiles ?? []) {
    const { data } = await adminResult.client.auth.admin.getUserById(profile.id)
    const email = data?.user?.email?.trim()
    if (email) emails.push(email)
  }
  return [...new Set(emails)]
}

export type NotifyResult = { sent: true } | { sent: false; error: string }

export async function notifyClientEstimatePending(input: {
  ticketId: string
  ticketTitle: string
  clientId: string
  estimatedHours: number
  priority: string
}): Promise<NotifyResult> {
  const recipients = await getClientNotificationEmails(input.clientId)
  if (!recipients.length) {
    return {
      sent: false,
      error: 'No client email on file — add an email on the client record or invite a portal user',
    }
  }

  const url = `${appOrigin()}/portal/tickets/${input.ticketId}`
  const hours = input.estimatedHours.toFixed(2).replace(/\.00$/, '')
  const priority = formatTicketPriority(input.priority)
  const ticketRef = formatTicketId(input.ticketId)

  const sent = await sendEmail({
    to: recipients,
    subject: `Action required: approve ${hours}h estimate for ${ticketRef}`,
    html: emailShell(
      'Approve your ticket estimate',
      `BTF has set an estimate of <strong>${hours} hours</strong> at <strong>${priority}</strong> priority for <strong>${input.ticketTitle}</strong> (${ticketRef}). Sign in to your support portal to review and approve the estimate and priority before work continues.`,
      'Open portal & approve',
      url
    ),
  })

  if (!sent) {
    return {
      sent: false,
      error:
        'Estimate is waiting on the client, but the notification email could not be sent. Check ZEPTOMAIL_API_KEY (Send Mail Token), ZEPTOMAIL_API_URL (.eu for EU accounts), and EMAIL_FROM.',
    }
  }

  return { sent: true }
}

export async function notifyStaffNewTicket(input: {
  ticketId: string
  ticketTitle: string
  ticketType: string
  clientId: string
}): Promise<NotifyResult> {
  const recipients = await getStaffNotificationEmails()
  if (!recipients.length) {
    return {
      sent: false,
      error: 'No admin or agent emails found — ensure staff users have signed up with email',
    }
  }

  const adminResult = tryCreateAdminClient()
  let clientName = 'Client'
  if (!('error' in adminResult)) {
    const { data: client } = await adminResult.client
      .from('clients')
      .select('name')
      .eq('id', input.clientId)
      .maybeSingle()
    if (client?.name) clientName = client.name
  }

  const url = `${appOrigin()}/admin/tickets/${input.ticketId}`
  const ticketRef = formatTicketId(input.ticketId)
  const typeLabel = input.ticketType.charAt(0).toUpperCase() + input.ticketType.slice(1)

  const sent = await sendEmail({
    to: recipients,
    subject: `New ticket from ${clientName} — ${ticketRef}`,
    html: emailShell(
      'New client request',
      `<strong>${clientName}</strong> submitted a new <strong>${typeLabel}</strong> ticket: <strong>${input.ticketTitle}</strong> (${ticketRef}). Review it in the admin queue and add an estimate when ready.`,
      'Open ticket',
      url
    ),
  })

  if (!sent) {
    return {
      sent: false,
      error:
        'Ticket was created but the team notification email could not be sent. Check ZEPTOMAIL_API_KEY, ZEPTOMAIL_API_URL, and EMAIL_FROM.',
    }
  }

  return { sent: true }
}

export async function notifyStaffEstimateApproved(input: {
  ticketId: string
  ticketTitle: string
  estimatedHours: number
  priority: string
}): Promise<NotifyResult> {
  const recipients = await getStaffNotificationEmails()
  if (!recipients.length) {
    return {
      sent: false,
      error: 'No admin or agent emails found — ensure staff users have signed up with email',
    }
  }

  const url = `${appOrigin()}/admin/tickets/${input.ticketId}`
  const hours = input.estimatedHours.toFixed(2).replace(/\.00$/, '')
  const priority = formatTicketPriority(input.priority)
  const ticketRef = formatTicketId(input.ticketId)

  const sent = await sendEmail({
    to: recipients,
    subject: `Client approved estimate — ${ticketRef}`,
    html: emailShell(
      'Client approved the estimate',
      `The client approved <strong>${hours}h</strong> at <strong>${priority}</strong> priority for <strong>${input.ticketTitle}</strong> (${ticketRef}). Work can continue — resolve and log actual hours when done.`,
      'Open ticket',
      url
    ),
  })

  if (!sent) {
    return {
      sent: false,
      error:
        'Estimate was approved but the team notification email could not be sent. Check ZEPTOMAIL_API_KEY and EMAIL_FROM.',
    }
  }

  return { sent: true }
}
