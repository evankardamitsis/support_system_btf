'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getRetainerForClient } from '@/lib/retainers/active'
import {
  getClientNotificationEmails,
  notifyClientEstimatePending,
  notifyStaffEstimateApproved,
  notifyStaffNewTicket,
} from '@/lib/email/ticket-notifications'
import { isEstimateLocked } from '@/lib/tickets/estimate'
import type { TicketStatus, TicketPriority } from '@/lib/types'

export type DeleteTicketResult = { ok: true } | { ok: false; error: string }

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

function revalidateTicketPaths(ticketId: string) {
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/admin/tickets')
  revalidatePath('/admin/retainers')
  revalidatePath(`/portal/tickets/${ticketId}`)
  revalidatePath('/portal/tickets')
}

export async function createTicket(formData: FormData): Promise<string> {
  const { supabase, user } = await requireStaff()

  const estRaw = formData.get('estimated_hours') as string | null
  const estimated =
    estRaw && estRaw.trim() !== '' ? parseFloat(estRaw) : null

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      client_id: formData.get('client_id') as string,
      created_by: user.id,
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || null,
      type: ((formData.get('type') as string) || 'task') as 'bug' | 'task' | 'request' | 'question',
      priority: ((formData.get('priority') as string) || 'normal') as TicketPriority,
      estimated_hours: estimated != null && !Number.isNaN(estimated) ? estimated : null,
    })
    .select('id')
    .single()

  if (error || !ticket) throw new Error(error?.message ?? 'Failed to create ticket')
  return ticket.id
}

export async function createPortalTicket(formData: FormData): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!profile?.client_id) {
    throw new Error('No client account linked')
  }

  const title = formData.get('title') as string
  const type = formData.get('type') as 'bug' | 'task' | 'request' | 'question'

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      client_id: profile.client_id,
      created_by: user.id,
      title,
      description: (formData.get('description') as string) || null,
      type,
    })
    .select('id')
    .single()

  if (error || !ticket) throw new Error(error?.message ?? 'Failed to create ticket')

  const staffNotify = await notifyStaffNewTicket({
    ticketId: ticket.id,
    ticketTitle: title,
    ticketType: type,
    clientId: profile.client_id,
  })
  if (!staffNotify.sent) {
    console.error('[email] staff new-ticket notification failed:', staffNotify.error)
  }

  revalidateTicketPaths(ticket.id)
  return ticket.id
}

export async function updateTicketPriority(ticketId: string, priority: TicketPriority) {
  const { supabase } = await requireStaff()
  const { data: ticket } = await supabase
    .from('tickets')
    .select('estimate_status')
    .eq('id', ticketId)
    .single()
  if (isEstimateLocked(ticket?.estimate_status ?? null)) {
    throw new Error('Priority is locked while the estimate is pending or approved')
  }
  const { error } = await supabase.from('tickets').update({ priority }).eq('id', ticketId)
  if (error) throw new Error(error.message)
  revalidateTicketPaths(ticketId)
}

export async function updateTicketEstimatedHours(ticketId: string, hours: number | null) {
  const { supabase } = await requireStaff()
  const { data: ticket } = await supabase
    .from('tickets')
    .select('estimate_status')
    .eq('id', ticketId)
    .single()
  if (isEstimateLocked(ticket?.estimate_status ?? null)) {
    throw new Error('Estimate is locked after submission or client approval')
  }
  const value =
    hours != null && !Number.isNaN(hours) && hours >= 0 ? Math.round(hours * 100) / 100 : null
  const { error } = await supabase
    .from('tickets')
    .update({ estimated_hours: value })
    .eq('id', ticketId)
  if (error) throw new Error(error.message)
  revalidateTicketPaths(ticketId)
}

export async function submitEstimateForApproval(ticketId: string) {
  const { supabase } = await requireStaff()

  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, title, client_id, estimated_hours, priority, estimate_status, status')
    .eq('id', ticketId)
    .single()

  if (fetchErr || !ticket) throw new Error(fetchErr?.message ?? 'Ticket not found')
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    throw new Error('Cannot submit an estimate on a closed ticket')
  }
  if (ticket.estimate_status === 'pending_approval') {
    throw new Error('Estimate is already awaiting client approval')
  }
  if (ticket.estimate_status === 'approved') {
    throw new Error('Estimate already approved by client')
  }
  const hours = ticket.estimated_hours != null ? Number(ticket.estimated_hours) : null
  if (hours == null || hours <= 0) {
    throw new Error('Enter estimated hours before submitting')
  }

  const clientEmails = await getClientNotificationEmails(ticket.client_id)
  if (!clientEmails.length) {
    throw new Error(
      'No client email on file — add an email on the client record or invite a portal user before submitting'
    )
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('tickets')
    .update({
      estimate_status: 'pending_approval',
      estimate_submitted_at: now,
      status: 'waiting_on_client',
    })
    .eq('id', ticketId)

  if (error) throw new Error(error.message)

  const notify = await notifyClientEstimatePending({
    ticketId,
    ticketTitle: ticket.title,
    clientId: ticket.client_id,
    estimatedHours: hours,
    priority: ticket.priority,
  })
  if (!notify.sent) {
    throw new Error(notify.error)
  }

  revalidateTicketPaths(ticketId)
}

export async function approveTicketEstimate(ticketId: string) {
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
    throw new Error('Only client users can approve estimates')
  }

  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, title, client_id, estimated_hours, priority, estimate_status')
    .eq('id', ticketId)
    .single()

  if (fetchErr || !ticket) throw new Error(fetchErr?.message ?? 'Ticket not found')
  if (ticket.client_id !== profile.client_id) {
    throw new Error('Not authorized for this ticket')
  }
  if (ticket.estimate_status !== 'pending_approval') {
    throw new Error('No estimate is waiting for your approval')
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('tickets')
    .update({
      estimate_status: 'approved',
      estimate_approved_at: now,
      status: 'in_progress',
    })
    .eq('id', ticketId)
    .eq('estimate_status', 'pending_approval')

  if (error) throw new Error(error.message)

  const hours = ticket.estimated_hours != null ? Number(ticket.estimated_hours) : 0
  const staffNotify = await notifyStaffEstimateApproved({
    ticketId,
    ticketTitle: ticket.title,
    estimatedHours: hours,
    priority: ticket.priority,
  })
  if (!staffNotify.sent) {
    console.error('[email] staff estimate-approved notification failed:', staffNotify.error)
  }

  revalidateTicketPaths(ticketId)
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const { supabase } = await requireStaff()

  if (status === 'resolved') {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('estimate_status')
      .eq('id', ticketId)
      .single()
    if (ticket?.estimate_status !== 'approved') {
      throw new Error('Client must approve the estimate before resolving')
    }
    const { data: existingLog } = await supabase
      .from('hours_log')
      .select('id')
      .eq('ticket_id', ticketId)
      .limit(1)
      .maybeSingle()
    if (!existingLog) {
      throw new Error('Use resolve with actual hours')
    }
  }
  const patch: { status: TicketStatus; resolved_at?: string | null } = { status }
  if (status === 'resolved' || status === 'closed') {
    patch.resolved_at = new Date().toISOString()
  } else {
    patch.resolved_at = null
  }
  const { error } = await supabase.from('tickets').update(patch).eq('id', ticketId)
  if (error) throw new Error(error.message)
  revalidateTicketPaths(ticketId)
}

export async function resolveTicketWithHours(ticketId: string, actualHours: number) {
  const { supabase, user } = await requireStaff()

  if (!actualHours || actualHours <= 0 || Number.isNaN(actualHours)) {
    throw new Error('Enter actual hours spent (greater than 0)')
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select('id, client_id, status, estimate_status')
    .eq('id', ticketId)
    .single()

  if (ticketErr || !ticket) throw new Error(ticketErr?.message ?? 'Ticket not found')
  if (ticket.estimate_status !== 'approved') {
    throw new Error('Client must approve the estimate before resolving')
  }

  const { data: existingLog } = await supabase
    .from('hours_log')
    .select('id')
    .eq('ticket_id', ticketId)
    .limit(1)
    .maybeSingle()

  const retainer = await getRetainerForClient(supabase, ticket.client_id)
  if (!retainer) {
    throw new Error('No retainer period for this client — add a retainer before logging hours')
  }

  const minutes = Math.round(actualHours * 60)
  const now = new Date().toISOString()

  if (!existingLog) {
    const { error: logErr } = await supabase.from('hours_log').insert({
      ticket_id: ticketId,
      retainer_id: retainer.id,
      agent_id: user.id,
      minutes,
      note: 'Logged on resolve',
    })
    if (logErr) throw new Error(logErr.message)
  }

  const { error: updateErr } = await supabase
    .from('tickets')
    .update({
      status: 'resolved',
      resolved_at: now,
      actual_hours: Math.round(actualHours * 100) / 100,
    })
    .eq('id', ticketId)

  if (updateErr) throw new Error(updateErr.message)
  revalidateTicketPaths(ticketId)
}

export async function updateTicketAssignee(ticketId: string, agentId: string | null) {
  const { supabase } = await requireStaff()
  const { error } = await supabase
    .from('tickets')
    .update({ assigned_to: agentId })
    .eq('id', ticketId)
  if (error) throw new Error(error.message)
  revalidateTicketPaths(ticketId)
}

export async function deleteTicket(ticketId: string): Promise<DeleteTicketResult> {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return { ok: false, error: 'Only admins can delete tickets' }
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return { ok: false, error: adminResult.error }
  }

  const { error } = await adminResult.client.from('tickets').delete().eq('id', ticketId)
  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/tickets')
  revalidatePath(`/admin/clients`)
  revalidatePath('/admin/retainers')
  return { ok: true }
}
