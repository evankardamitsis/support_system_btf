'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import {
  getClientNotificationEmails,
  notifyClientExtraHoursPending,
  notifyStaffExtraHoursApproved,
} from '@/lib/email/ticket-notifications'
import { assertClientCanUseRetainer } from '@/lib/retainers/guards'
import { isTicketClosed } from '@/lib/tickets/closed'

async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'agent'].includes(profile.role)) {
    throw new Error('Not authorized')
  }
  return { supabase, user }
}

function revalidateExtraHoursPaths(ticketId: string) {
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/admin/tickets')
  revalidatePath(`/portal/tickets/${ticketId}`)
  revalidatePath('/portal/tickets')
  revalidatePath('/admin/retainers')
  revalidatePath('/admin/clients')
}

export async function submitExtraHours(
  ticketId: string,
  retainerId: string,
  minutes: number,
  note?: string
) {
  const { supabase, user } = await requireStaff()

  if (!minutes || minutes <= 0 || Number.isNaN(minutes)) {
    throw new Error('Enter hours (greater than 0)')
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select('id, client_id, status, title')
    .eq('id', ticketId)
    .single()

  if (ticketErr || !ticket) throw new Error(ticketErr?.message ?? 'Ticket not found')
  if (!isTicketClosed(ticket.status)) {
    throw new Error('Extra hours can only be requested on resolved or closed tickets')
  }

  const { data: retainer } = await supabase
    .from('retainers')
    .select('id, client_id')
    .eq('id', retainerId)
    .single()

  if (!retainer || retainer.client_id !== ticket.client_id) {
    throw new Error('Invalid billing period for this client')
  }

  await assertClientCanUseRetainer(supabase, ticket.client_id)

  const clientEmails = await getClientNotificationEmails(ticket.client_id)
  if (!clientEmails.length) {
    throw new Error(
      'No client email on file — add an email on the client record or invite a portal user before requesting extra hours'
    )
  }

  const { error } = await supabase.from('ticket_extra_hours').insert({
    ticket_id: ticketId,
    retainer_id: retainerId,
    agent_id: user.id,
    minutes,
    note: note?.trim() || null,
    status: 'pending_approval',
  })

  if (error) throw new Error(error.message)

  const notify = await notifyClientExtraHoursPending({
    ticketId,
    ticketTitle: ticket.title,
    clientId: ticket.client_id,
    hours: Math.round((minutes / 60) * 100) / 100,
  })
  if (!notify.sent) {
    throw new Error(notify.error)
  }

  revalidateExtraHoursPaths(ticketId)
}

export async function approveExtraHours(extraHoursId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, client_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client' || !profile.client_id) {
    throw new Error('Only client users can approve extra hours')
  }

  const { data: request, error: fetchErr } = await supabase
    .from('ticket_extra_hours')
    .select('id, ticket_id, retainer_id, agent_id, minutes, note, status, tickets(client_id, status, title)')
    .eq('id', extraHoursId)
    .single()

  if (fetchErr || !request) throw new Error(fetchErr?.message ?? 'Request not found')

  const ticket = request.tickets as unknown as {
    client_id: string
    status: string
    title: string
  } | null

  if (!ticket || ticket.client_id !== profile.client_id) {
    throw new Error('Not authorized for this request')
  }
  if (!isTicketClosed(ticket.status as 'resolved' | 'closed')) {
    throw new Error('This ticket is not closed')
  }
  if (request.status !== 'pending_approval') {
    throw new Error('No extra hours are waiting for your approval')
  }

  await assertClientCanUseRetainer(supabase, ticket.client_id)

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    throw new Error(adminResult.error)
  }
  const admin = adminResult.client

  const { data: hoursLog, error: logErr } = await admin
    .from('hours_log')
    .insert({
      ticket_id: request.ticket_id,
      retainer_id: request.retainer_id,
      agent_id: request.agent_id,
      minutes: request.minutes,
      note: request.note ?? 'Extra hours (client approved)',
      is_extra: true,
    })
    .select('id')
    .single()

  if (logErr || !hoursLog) throw new Error(logErr?.message ?? 'Could not record extra hours')

  const now = new Date().toISOString()
  const { error: updateErr } = await admin
    .from('ticket_extra_hours')
    .update({
      status: 'approved',
      approved_at: now,
      hours_log_id: hoursLog.id,
    })
    .eq('id', extraHoursId)
    .eq('status', 'pending_approval')

  if (updateErr) throw new Error(updateErr.message)

  const staffNotify = await notifyStaffExtraHoursApproved({
    ticketId: request.ticket_id,
    ticketTitle: ticket.title,
    hours: Math.round((request.minutes / 60) * 100) / 100,
  })
  if (!staffNotify.sent) {
    console.error('[email] staff extra-hours-approved notification failed:', staffNotify.error)
  }

  revalidateExtraHoursPaths(request.ticket_id)
}
