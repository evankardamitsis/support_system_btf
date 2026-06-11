import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { loadClientPortalRegistrationStatus } from '@/lib/clients/portal-registration'
import {
  notifyClientEstimatePending,
  notifyClientExtraHoursPending,
  notifyClientWorkReviewPending,
  notifyStaffEstimateApproved,
  notifyStaffExtraHoursApproved,
  notifyStaffWorkApproved,
} from '@/lib/email/ticket-notifications'
import { approvalReminderResetPatch } from '@/lib/tickets/approval-reminders'

export async function isClientPortalRegistered(
  admin: SupabaseClient<Database>,
  clientId: string
): Promise<boolean> {
  const status = await loadClientPortalRegistrationStatus(admin, clientId)
  return status.state === 'registered'
}

export async function autoApproveTicketEstimate(
  supabase: SupabaseClient<Database>,
  ticket: {
    id: string
    title: string
    estimated_hours: number | null
    priority: string
  }
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('tickets')
    .update({
      estimate_status: 'approved',
      estimate_submitted_at: now,
      estimate_approved_at: now,
      status: 'in_progress',
      ...approvalReminderResetPatch(),
    })
    .eq('id', ticket.id)

  if (error) throw new Error(error.message)

  const hours = ticket.estimated_hours != null ? Number(ticket.estimated_hours) : 0
  const staffNotify = await notifyStaffEstimateApproved({
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    estimatedHours: hours,
    priority: ticket.priority,
  })
  if (!staffNotify.sent) {
    console.error('[email] staff estimate-approved notification failed:', staffNotify.error)
  }
}

export async function autoApproveTicketWork(
  supabase: SupabaseClient<Database>,
  ticket: { id: string; title: string }
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('tickets')
    .update({
      completion_status: 'approved',
      completion_submitted_at: now,
      completion_approved_at: now,
      status: 'in_progress',
      ...approvalReminderResetPatch(),
    })
    .eq('id', ticket.id)

  if (error) throw new Error(error.message)

  const staffNotify = await notifyStaffWorkApproved({
    ticketId: ticket.id,
    ticketTitle: ticket.title,
  })
  if (!staffNotify.sent) {
    console.error('[email] staff work-approved notification failed:', staffNotify.error)
  }
}

/** Notify the client about approvals that were waiting while they were not on the portal. */
export async function sendDeferredApprovalNotifications(
  admin: SupabaseClient<Database>,
  clientId: string
): Promise<void> {
  const [{ data: estimateTickets }, { data: workTickets }, { data: extraHours }] =
    await Promise.all([
      admin
        .from('tickets')
        .select('id, title, client_id, estimated_hours, priority')
        .eq('client_id', clientId)
        .eq('estimate_status', 'pending_approval'),
      admin
        .from('tickets')
        .select('id, title, client_id')
        .eq('client_id', clientId)
        .eq('completion_status', 'pending_approval'),
      admin
        .from('ticket_extra_hours')
        .select('id, minutes, tickets!inner(id, title, client_id)')
        .eq('status', 'pending_approval')
        .eq('tickets.client_id', clientId),
    ])

  for (const ticket of estimateTickets ?? []) {
    const hours =
      ticket.estimated_hours != null ? Number(ticket.estimated_hours) : 0
    const notify = await notifyClientEstimatePending({
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      clientId: ticket.client_id,
      estimatedHours: hours,
      priority: ticket.priority,
    })
    if (!notify.sent) {
      console.error('[email] deferred estimate approval notification failed:', notify.error)
    }
  }

  for (const ticket of workTickets ?? []) {
    const notify = await notifyClientWorkReviewPending({
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      clientId: ticket.client_id,
    })
    if (!notify.sent) {
      console.error('[email] deferred work approval notification failed:', notify.error)
    }
  }

  for (const request of extraHours ?? []) {
    const ticket = request.tickets as unknown as {
      id: string
      title: string
      client_id: string
    } | null
    if (!ticket) continue

    const notify = await notifyClientExtraHoursPending({
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      clientId: ticket.client_id,
      hours: Math.round((request.minutes / 60) * 100) / 100,
    })
    if (!notify.sent) {
      console.error('[email] deferred extra-hours notification failed:', notify.error)
    }
  }
}

export async function autoApproveExtraHoursRequest(
  admin: SupabaseClient<Database>,
  input: {
    extraHoursId: string
    ticketId: string
    ticketTitle: string
    minutes: number
  }
): Promise<void> {
  const now = new Date().toISOString()
  const { error: updateErr } = await admin
    .from('ticket_extra_hours')
    .update({
      status: 'approved',
      approved_at: now,
    })
    .eq('id', input.extraHoursId)

  if (updateErr) throw new Error(updateErr.message)

  const { error: ticketUpdateErr } = await admin
    .from('tickets')
    .update({
      status: 'in_progress',
      extra_hours_active_at: now,
    })
    .eq('id', input.ticketId)
    .in('status', ['resolved', 'closed'])

  if (ticketUpdateErr) throw new Error(ticketUpdateErr.message)

  const staffNotify = await notifyStaffExtraHoursApproved({
    ticketId: input.ticketId,
    ticketTitle: input.ticketTitle,
    hours: Math.round((input.minutes / 60) * 100) / 100,
  })
  if (!staffNotify.sent) {
    console.error('[email] staff extra-hours-approved notification failed:', staffNotify.error)
  }
}
