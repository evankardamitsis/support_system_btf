'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { requireClient } from '@/lib/auth/require-client'
import { getRetainerForClient } from '@/lib/retainers/active'
import { clientUsesHourBilling } from '@/lib/retainers/billing-model'
import { loadTicketHourBilling } from '@/lib/tickets/hours-billing'
import { assertClientCanUseRetainer } from '@/lib/retainers/guards'
import {
  getClientNotificationEmails,
  notifyClientEstimatePending,
  notifyClientTicketResolved,
  notifyClientWorkReviewPending,
  notifyStaffEstimateApproved,
  notifyStaffNewTicket,
  notifyStaffTicketAssigned,
  notifyStaffWorkApproved,
  notifyStaffWorkDisputed,
} from '@/lib/email/ticket-notifications'
import {
  canEditTicketPriority,
  isTicketClosed,
  TICKET_LOCKED_MESSAGE,
  TICKET_PRIORITY_LOCKED_MESSAGE,
} from '@/lib/tickets/closed'
import { approvalReminderResetPatch } from '@/lib/tickets/approval-reminders'
import { isEstimateLocked } from '@/lib/tickets/estimate'
import { billApprovedExtraHoursForTicket } from '@/lib/tickets/extra-hours-billing'
import { resolveHoursOverageNote } from '@/lib/tickets/hours-overage'
import type { Database } from '@/lib/database.types'
import type { TicketStatus, TicketPriority } from '@/lib/types'

type TicketUpdate = Database['public']['Tables']['tickets']['Update']

export type DeleteTicketResult = { ok: true } | { ok: false; error: string }

async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'agent'].includes(profile.role)) {
    throw new Error('Not authorized')
  }
  return { supabase, user, profile }
}

async function assertStaffAssignee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agentId: string
) {
  const { data: assignee } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', agentId)
    .maybeSingle()
  if (!assignee || !['admin', 'agent'].includes(assignee.role)) {
    throw new Error('Assignee must be an admin or agent')
  }
}

async function notifyAssigneeIfNeeded(input: {
  ticketId: string
  ticketTitle: string
  clientId: string
  assigneeId: string | null
  assignerId: string
  assignerName: string
}) {
  if (!input.assigneeId || input.assigneeId === input.assignerId) return

  const adminResult = tryCreateAdminClient()
  let clientName: string | null = null
  if (!('error' in adminResult)) {
    const { data: client } = await adminResult.client
      .from('clients')
      .select('name')
      .eq('id', input.clientId)
      .maybeSingle()
    clientName = client?.name ?? null
  }

  const notify = await notifyStaffTicketAssigned({
    ticketId: input.ticketId,
    ticketTitle: input.ticketTitle,
    assigneeUserId: input.assigneeId,
    assignerName: input.assignerName,
    clientName,
  })
  if (!notify.sent) {
    console.error('[email] staff ticket-assigned notification failed:', notify.error)
  }
}

async function assertTicketOpen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ticketId: string
) {
  const { data: ticket } = await supabase
    .from('tickets')
    .select('status')
    .eq('id', ticketId)
    .single()
  if (!ticket) throw new Error('Ticket not found')
  if (isTicketClosed(ticket.status)) {
    throw new Error(TICKET_LOCKED_MESSAGE)
  }
}

async function staffPatchTicket(ticketId: string, patch: TicketUpdate) {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    throw new Error(adminResult.error)
  }
  const { error } = await adminResult.client.from('tickets').update(patch).eq('id', ticketId)
  if (error) throw new Error(error.message)
}

function revalidateTicketPaths(ticketId: string) {
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/admin/tickets')
  revalidatePath('/admin/retainers')
  revalidatePath(`/portal/tickets/${ticketId}`)
  revalidatePath('/portal/tickets')
}

export async function createTicket(formData: FormData): Promise<string> {
  const { supabase, user, profile } = await requireStaff()

  const estRaw = formData.get('estimated_hours') as string | null
  const estimated =
    estRaw && estRaw.trim() !== '' ? parseFloat(estRaw) : null
  const assigneeRaw = (formData.get('assigned_to') as string | null)?.trim()
  const assignedTo = assigneeRaw && assigneeRaw.length > 0 ? assigneeRaw : null
  if (assignedTo) await assertStaffAssignee(supabase, assignedTo)

  const clientId = formData.get('client_id') as string
  const title = formData.get('title') as string
  const noHours = formData.get('no_hours') === 'true'

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      client_id: clientId,
      created_by: user.id,
      assigned_to: assignedTo,
      title,
      description: (formData.get('description') as string) || null,
      type: (noHours
        ? 'bug'
        : (formData.get('type') as string) || 'task') as 'bug' | 'task' | 'request' | 'question',
      priority: ((formData.get('priority') as string) || 'normal') as TicketPriority,
      estimated_hours:
        noHours || estimated == null || Number.isNaN(estimated) ? null : estimated,
      no_hours: noHours,
    })
    .select('id')
    .single()

  if (error || !ticket) throw new Error(error?.message ?? 'Failed to create ticket')

  if (assignedTo) {
    void notifyAssigneeIfNeeded({
      ticketId: ticket.id,
      ticketTitle: title,
      clientId,
      assigneeId: assignedTo,
      assignerId: user.id,
      assignerName: profile.full_name?.trim() || 'A teammate',
    })
  }

  revalidateTicketPaths(ticket.id)
  return ticket.id
}

export async function createPortalTicket(formData: FormData): Promise<string> {
  const { supabase, user, clientId } = await requireClient()

  await assertClientCanUseRetainer(supabase, clientId)

  const title = formData.get('title') as string
  const type = formData.get('type') as 'bug' | 'task' | 'request' | 'question'

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    throw new Error(adminResult.error)
  }

  const { data: ticket, error } = await adminResult.client
    .from('tickets')
    .insert({
      client_id: clientId,
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
    clientId,
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
    .select('status')
    .eq('id', ticketId)
    .single()

  if (!ticket) throw new Error('Ticket not found')
  if (!canEditTicketPriority(ticket.status)) {
    throw new Error(TICKET_PRIORITY_LOCKED_MESSAGE)
  }

  const { error } = await supabase.from('tickets').update({ priority }).eq('id', ticketId)
  if (error) throw new Error(error.message)
  revalidateTicketPaths(ticketId)
}

export async function updateTicketEstimatedHours(ticketId: string, hours: number | null) {
  const { supabase } = await requireStaff()
  await assertTicketOpen(supabase, ticketId)
  const { data: ticket } = await supabase
    .from('tickets')
    .select('estimate_status, client_id, no_hours')
    .eq('id', ticketId)
    .single()
  if (
    ticket &&
    !(await loadTicketHourBilling(supabase, ticket.client_id, ticket.no_hours))
  ) {
    throw new Error('This ticket does not use hour tracking')
  }
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
  await assertTicketOpen(supabase, ticketId)

  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select(
      'id, title, client_id, estimated_hours, priority, estimate_status, status, no_hours'
    )
    .eq('id', ticketId)
    .single()

  if (fetchErr || !ticket) throw new Error(fetchErr?.message ?? 'Ticket not found')
  if (!(await loadTicketHourBilling(supabase, ticket.client_id, ticket.no_hours))) {
    throw new Error('This ticket does not use estimates')
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
      ...approvalReminderResetPatch(),
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
    .select('id, title, client_id, estimated_hours, priority, estimate_status, status')
    .eq('id', ticketId)
    .single()

  if (fetchErr || !ticket) throw new Error(fetchErr?.message ?? 'Ticket not found')
  if (ticket.client_id !== profile.client_id) {
    throw new Error('Not authorized for this ticket')
  }
  if (isTicketClosed(ticket.status)) {
    throw new Error(TICKET_LOCKED_MESSAGE)
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
      ...approvalReminderResetPatch(),
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

export async function submitWorkForClientCheck(ticketId: string) {
  const { supabase } = await requireStaff()
  await assertTicketOpen(supabase, ticketId)

  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, title, client_id, estimate_status, completion_status, status, no_hours')
    .eq('id', ticketId)
    .single()

  if (fetchErr || !ticket) throw new Error(fetchErr?.message ?? 'Ticket not found')
  if (!(await loadTicketHourBilling(supabase, ticket.client_id, ticket.no_hours))) {
    throw new Error('This ticket does not use work approval')
  }
  if (ticket.estimate_status !== 'approved') {
    throw new Error('Client must approve the estimate before submitting work for review')
  }
  if (ticket.completion_status === 'pending_approval') {
    throw new Error('Work is already awaiting client approval')
  }
  if (ticket.completion_status === 'approved') {
    throw new Error('Client has already approved this work')
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
      completion_status: 'pending_approval',
      completion_submitted_at: now,
      completion_dispute_note: null,
      completion_disputed_at: null,
      status: 'waiting_on_client',
      ...approvalReminderResetPatch(),
    })
    .eq('id', ticketId)

  if (error) throw new Error(error.message)

  const notify = await notifyClientWorkReviewPending({
    ticketId,
    ticketTitle: ticket.title,
    clientId: ticket.client_id,
  })
  if (!notify.sent) {
    throw new Error(notify.error)
  }

  revalidateTicketPaths(ticketId)
}

export async function approveTicketWork(ticketId: string) {
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
    throw new Error('Only client users can approve completed work')
  }

  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, title, client_id, completion_status, status')
    .eq('id', ticketId)
    .single()

  if (fetchErr || !ticket) throw new Error(fetchErr?.message ?? 'Ticket not found')
  if (ticket.client_id !== profile.client_id) {
    throw new Error('Not authorized for this ticket')
  }
  if (isTicketClosed(ticket.status)) {
    throw new Error(TICKET_LOCKED_MESSAGE)
  }
  if (ticket.completion_status !== 'pending_approval') {
    throw new Error('No completed work is waiting for your approval')
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('tickets')
    .update({
      completion_status: 'approved',
      completion_approved_at: now,
      status: 'in_progress',
      ...approvalReminderResetPatch(),
    })
    .eq('id', ticketId)
    .eq('completion_status', 'pending_approval')

  if (error) throw new Error(error.message)

  const staffNotify = await notifyStaffWorkApproved({
    ticketId,
    ticketTitle: ticket.title,
  })
  if (!staffNotify.sent) {
    console.error('[email] staff work-approved notification failed:', staffNotify.error)
  }

  revalidateTicketPaths(ticketId)
}

export async function disputeTicketWork(ticketId: string, concerns: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const trimmed = concerns.trim()
  if (!trimmed) {
    throw new Error('Describe what needs to be addressed before we can close this ticket')
  }
  if (trimmed.length < 10) {
    throw new Error('Please provide a bit more detail about your concerns')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, client_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client' || !profile.client_id) {
    throw new Error('Only client users can dispute completed work')
  }

  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, title, client_id, completion_status, status')
    .eq('id', ticketId)
    .single()

  if (fetchErr || !ticket) throw new Error(fetchErr?.message ?? 'Ticket not found')
  if (ticket.client_id !== profile.client_id) {
    throw new Error('Not authorized for this ticket')
  }
  if (isTicketClosed(ticket.status)) {
    throw new Error(TICKET_LOCKED_MESSAGE)
  }
  if (ticket.completion_status !== 'pending_approval') {
    throw new Error('No completed work is waiting for your approval')
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    throw new Error(adminResult.error)
  }
  const admin = adminResult.client

  const now = new Date().toISOString()
  const { error: updateErr } = await admin
    .from('tickets')
    .update({
      completion_status: null,
      completion_dispute_note: trimmed,
      completion_disputed_at: now,
      status: 'in_progress',
      ...approvalReminderResetPatch(),
    })
    .eq('id', ticketId)
    .eq('client_id', profile.client_id)
    .eq('completion_status', 'pending_approval')

  if (updateErr) throw new Error(updateErr.message)

  const commentBody = `Disputed completion:\n\n${trimmed}`
  const { error: commentErr } = await supabase.from('ticket_comments').insert({
    ticket_id: ticketId,
    author_id: user.id,
    body: commentBody,
    is_internal: false,
  })

  if (commentErr) throw new Error(commentErr.message)

  const staffNotify = await notifyStaffWorkDisputed({
    ticketId,
    ticketTitle: ticket.title,
    concerns: trimmed,
  })
  if (!staffNotify.sent) {
    console.error('[email] staff work-disputed notification failed:', staffNotify.error)
  }

  revalidateTicketPaths(ticketId)
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const { supabase } = await requireStaff()
  await assertTicketOpen(supabase, ticketId)

  let resolvedNotify: {
    clientId: string
    title: string
    estimatedHours: number | null
    actualHours: number
    noHours: boolean
  } | null = null

  if (status === 'resolved') {
    const { data: ticket } = await supabase
      .from('tickets')
      .select(
        'estimate_status, completion_status, status, title, client_id, estimated_hours, actual_hours, no_hours'
      )
      .eq('id', ticketId)
      .single()

    const hourBilling = ticket?.client_id
      ? await loadTicketHourBilling(supabase, ticket.client_id, ticket.no_hours)
      : true

    if (hourBilling) {
      if (ticket?.estimate_status !== 'approved') {
        throw new Error('Client must approve the estimate before resolving')
      }
      if (ticket?.completion_status === 'pending_approval') {
        throw new Error('Client must approve the completed work before resolving')
      }
    }

    if (ticket?.client_id) {
      await assertClientCanUseRetainer(supabase, ticket.client_id)
    }

    if (hourBilling) {
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

    if (ticket && ticket.status !== 'resolved') {
      if (hourBilling) {
        const actual = ticket.actual_hours != null ? Number(ticket.actual_hours) : null
        if (actual != null && actual > 0) {
          resolvedNotify = {
            clientId: ticket.client_id,
            title: ticket.title,
            estimatedHours:
              ticket.estimated_hours != null ? Number(ticket.estimated_hours) : null,
            actualHours: actual,
            noHours: false,
          }
        }
      } else {
        resolvedNotify = {
          clientId: ticket.client_id,
          title: ticket.title,
          estimatedHours: null,
          actualHours: 0,
          noHours: ticket.no_hours ?? false,
        }
      }
    }
  }

  const patch: { status: TicketStatus; resolved_at?: string | null } = { status }
  if (status === 'resolved' || status === 'closed') {
    patch.resolved_at = new Date().toISOString()
  } else {
    patch.resolved_at = null
  }
  await staffPatchTicket(ticketId, patch)

  if (resolvedNotify) {
    const clientNotify = await notifyClientTicketResolved({
      ticketId,
      ticketTitle: resolvedNotify.title,
      clientId: resolvedNotify.clientId,
      estimatedHours: resolvedNotify.estimatedHours,
      actualHours: resolvedNotify.actualHours,
      noHours: resolvedNotify.noHours,
    })
    if (!clientNotify.sent) {
      console.error('[email] client ticket-resolved notification failed:', clientNotify.error)
    }
  }

  revalidateTicketPaths(ticketId)
}

/** Resolve a ticket for fixed (non-hour) retainer clients — no hours logged. */
export async function resolveTicketSimple(ticketId: string) {
  const { supabase } = await requireStaff()

  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select('id, client_id, status, title, no_hours')
    .eq('id', ticketId)
    .single()

  if (ticketErr || !ticket) throw new Error(ticketErr?.message ?? 'Ticket not found')
  if (isTicketClosed(ticket.status)) {
    throw new Error(TICKET_LOCKED_MESSAGE)
  }

  const hourBilling = await loadTicketHourBilling(
    supabase,
    ticket.client_id,
    ticket.no_hours
  )
  if (hourBilling) {
    throw new Error('This ticket uses hour-based billing — log hours to resolve')
  }

  await assertClientCanUseRetainer(supabase, ticket.client_id)

  const now = new Date().toISOString()
  await staffPatchTicket(ticketId, {
    status: 'resolved',
    resolved_at: now,
  })

  const clientNotify = await notifyClientTicketResolved({
    ticketId,
    ticketTitle: ticket.title,
    clientId: ticket.client_id,
    estimatedHours: null,
    actualHours: 0,
    noHours: ticket.no_hours ?? false,
  })
  if (!clientNotify.sent) {
    console.error('[email] client ticket-resolved notification failed:', clientNotify.error)
  }

  revalidateTicketPaths(ticketId)
}

export async function resolveTicketWithHours(
  ticketId: string,
  actualHours: number,
  overageNote?: string
) {
  const { supabase, user } = await requireStaff()

  if (!actualHours || actualHours <= 0 || Number.isNaN(actualHours)) {
    throw new Error('Enter actual hours spent (greater than 0)')
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select(
      'id, client_id, status, estimate_status, completion_status, title, estimated_hours, no_hours'
    )
    .eq('id', ticketId)
    .single()

  if (ticketErr || !ticket) throw new Error(ticketErr?.message ?? 'Ticket not found')
  if (isTicketClosed(ticket.status)) {
    throw new Error(TICKET_LOCKED_MESSAGE)
  }
  if (ticket.no_hours) {
    throw new Error('This ticket is marked no hours — use Mark resolved instead')
  }
  if (ticket.estimate_status !== 'approved') {
    throw new Error('Client must approve the estimate before resolving')
  }
  if (ticket.completion_status === 'pending_approval') {
    throw new Error('Client must approve the completed work before resolving')
  }

  const { data: existingLog } = await supabase
    .from('hours_log')
    .select('id')
    .eq('ticket_id', ticketId)
    .limit(1)
    .maybeSingle()

  await assertClientCanUseRetainer(supabase, ticket.client_id)

  const retainer = await getRetainerForClient(supabase, ticket.client_id)
  if (!retainer) {
    throw new Error('No retainer period for this client — add a retainer before logging hours')
  }

  const minutes = Math.round(actualHours * 60)
  const now = new Date().toISOString()
  const estimatedHours =
    ticket.estimated_hours != null ? Number(ticket.estimated_hours) : null
  const hoursOverageNote = resolveHoursOverageNote(estimatedHours, actualHours, overageNote)

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

  await staffPatchTicket(ticketId, {
    status: 'resolved',
    resolved_at: now,
    actual_hours: Math.round(actualHours * 100) / 100,
    hours_overage_note: hoursOverageNote,
  })

  const roundedActual = Math.round(actualHours * 100) / 100
  const clientNotify = await notifyClientTicketResolved({
    ticketId,
    ticketTitle: ticket.title,
    clientId: ticket.client_id,
    estimatedHours:
      ticket.estimated_hours != null ? Number(ticket.estimated_hours) : null,
    actualHours: roundedActual,
  })
  if (!clientNotify.sent) {
    console.error('[email] client ticket-resolved notification failed:', clientNotify.error)
  }

  revalidateTicketPaths(ticketId)
}

export async function resolveTicketOffline(
  ticketId: string,
  actualHours: number,
  overageNote?: string
) {
  const { isAdmin, user } = await requireAdmin()
  if (!isAdmin || !user) {
    throw new Error('Only admins can resolve tickets offline')
  }

  if (!actualHours || actualHours <= 0 || Number.isNaN(actualHours)) {
    throw new Error('Enter actual hours spent (greater than 0)')
  }

  const supabase = await createClient()
  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select(
      'id, client_id, status, estimate_status, estimated_hours, completion_status, title, no_hours'
    )
    .eq('id', ticketId)
    .single()

  if (ticketErr || !ticket) throw new Error(ticketErr?.message ?? 'Ticket not found')
  if (isTicketClosed(ticket.status)) {
    throw new Error(TICKET_LOCKED_MESSAGE)
  }
  if (ticket.no_hours) {
    throw new Error('This ticket is marked no hours — use Mark resolved instead')
  }

  await assertClientCanUseRetainer(supabase, ticket.client_id)

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    throw new Error(adminResult.error)
  }
  const admin = adminResult.client

  const { data: existingLog } = await supabase
    .from('hours_log')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('is_extra', false)
    .limit(1)
    .maybeSingle()

  const retainer = await getRetainerForClient(supabase, ticket.client_id)
  if (!retainer) {
    throw new Error('No retainer period for this client — add a retainer before logging hours')
  }

  const minutes = Math.round(actualHours * 60)
  const now = new Date().toISOString()
  const roundedActual = Math.round(actualHours * 100) / 100
  const estimatedHours =
    ticket.estimated_hours != null ? Number(ticket.estimated_hours) : null
  const hasEstimate = estimatedHours != null && estimatedHours > 0
  const hoursOverageNote = resolveHoursOverageNote(estimatedHours, actualHours, overageNote)

  if (!existingLog) {
    const { error: logErr } = await admin.from('hours_log').insert({
      ticket_id: ticketId,
      retainer_id: retainer.id,
      agent_id: user.id,
      minutes,
      note: 'Logged on offline resolve',
      is_extra: false,
    })
    if (logErr) throw new Error(logErr.message)
  }

  await billApprovedExtraHoursForTicket(admin, ticketId)

  const { error: clearExtraErr } = await admin
    .from('ticket_extra_hours')
    .delete()
    .eq('ticket_id', ticketId)
    .eq('status', 'pending_approval')

  if (clearExtraErr) throw new Error(clearExtraErr.message)

  await staffPatchTicket(ticketId, {
    status: 'resolved',
    resolved_at: now,
    actual_hours: roundedActual,
    estimate_status: hasEstimate ? 'approved' : ticket.estimate_status,
    estimate_approved_at: hasEstimate ? now : null,
    completion_status: null,
    completion_submitted_at: null,
    completion_approved_at: null,
    completion_dispute_note: null,
    completion_disputed_at: null,
    extra_hours_active_at: null,
    hours_overage_note: hoursOverageNote,
  })

  const clientNotify = await notifyClientTicketResolved({
    ticketId,
    ticketTitle: ticket.title,
    clientId: ticket.client_id,
    estimatedHours: hasEstimate ? estimatedHours : null,
    actualHours: roundedActual,
  })
  if (!clientNotify.sent) {
    console.error('[email] client ticket-resolved notification failed:', clientNotify.error)
  }

  revalidateTicketPaths(ticketId)
  revalidatePath(`/portal/tickets/${ticketId}`)
  revalidatePath('/portal/tickets')
}

export async function updateTicketAssignee(ticketId: string, agentId: string | null) {
  const { supabase, user, profile } = await requireStaff()

  if (agentId) await assertStaffAssignee(supabase, agentId)

  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, title, client_id, assigned_to')
    .eq('id', ticketId)
    .single()
  if (fetchErr || !ticket) throw new Error(fetchErr?.message ?? 'Ticket not found')
  if (ticket.assigned_to === agentId) return

  const { error } = await supabase
    .from('tickets')
    .update({ assigned_to: agentId })
    .eq('id', ticketId)
  if (error) throw new Error(error.message)

  await notifyAssigneeIfNeeded({
    ticketId,
    ticketTitle: ticket.title,
    clientId: ticket.client_id,
    assigneeId: agentId,
    assignerId: user.id,
    assignerName: profile.full_name?.trim() || 'A teammate',
  })

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
