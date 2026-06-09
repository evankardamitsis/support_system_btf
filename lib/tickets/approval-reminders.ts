import {
  notifyClientApprovalReminder,
  notifyStaffTicketOnHold,
} from '@/lib/email/ticket-notifications'
import { tryCreateAdminClient } from '@/lib/supabase/admin'

/** Days after initial approval request when each reminder is sent. */
export const APPROVAL_REMINDER_1_DAYS = 2
/** Second reminder: 3 days after the first reminder (day 5 overall). */
export const APPROVAL_REMINDER_2_DAYS = 5
/** Place ticket on hold the day after the second reminder if still no response. */
export const APPROVAL_ON_HOLD_DAYS = 6

export type TicketApprovalKind = 'estimate' | 'work' | 'extra_hours'

function utcDayStart(iso: string): number {
  const d = new Date(iso)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function daysSincePending(pendingSince: string, onDate = new Date()): number {
  const start = utcDayStart(pendingSince)
  const end = utcDayStart(onDate.toISOString())
  return Math.floor((end - start) / 86400000)
}

type PendingTicketRow = {
  id: string
  title: string
  client_id: string
  status: string
  estimate_status: string | null
  completion_status: string | null
  estimated_hours: number | null
  estimate_submitted_at: string | null
  completion_submitted_at: string | null
  approval_reminder_count: number
  no_hours?: boolean
}

function ticketApprovalKind(row: PendingTicketRow): TicketApprovalKind | null {
  if (row.estimate_status === 'pending_approval') return 'estimate'
  if (row.completion_status === 'pending_approval') return 'work'
  return null
}

function ticketPendingSince(row: PendingTicketRow): string | null {
  if (row.estimate_status === 'pending_approval') return row.estimate_submitted_at
  if (row.completion_status === 'pending_approval') return row.completion_submitted_at
  return null
}

export async function processTicketApprovalReminders(): Promise<{
  checked: number
  reminder1: number
  reminder2: number
  onHold: number
  extraReminder1: number
  extraReminder2: number
  errors: string[]
}> {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return {
      checked: 0,
      reminder1: 0,
      reminder2: 0,
      onHold: 0,
      extraReminder1: 0,
      extraReminder2: 0,
      errors: [adminResult.error],
    }
  }

  const supabase = adminResult.client
  const errors: string[] = []
  let reminder1 = 0
  let reminder2 = 0
  let onHold = 0
  let extraReminder1 = 0
  let extraReminder2 = 0

  const { data: reminderOptOut, error: optOutError } = await supabase
    .from('clients')
    .select('id')
    .eq('approval_reminders_enabled', false)

  if (optOutError) throw new Error(optOutError.message)

  const remindersDisabled = new Set((reminderOptOut ?? []).map(client => client.id))

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(
      'id, title, client_id, status, estimate_status, completion_status, estimated_hours, estimate_submitted_at, completion_submitted_at, approval_reminder_count, no_hours'
    )
    .or('estimate_status.eq.pending_approval,completion_status.eq.pending_approval')

  if (error) throw new Error(error.message)

  for (const row of tickets ?? []) {
    if (remindersDisabled.has(row.client_id)) continue
    if (row.no_hours) continue

    const kind = ticketApprovalKind(row)
    const pendingSince = ticketPendingSince(row)
    if (!kind || !pendingSince) continue

    const days = daysSincePending(pendingSince)
    const count = row.approval_reminder_count ?? 0

    if (days >= APPROVAL_ON_HOLD_DAYS && count >= 2) {
      if (row.status !== 'on_hold') {
        const now = new Date().toISOString()
        const { error: holdError } = await supabase
          .from('tickets')
          .update({
            status: 'on_hold',
            on_hold_at: now,
            updated_at: now,
          })
          .eq('id', row.id)

        if (holdError) {
          errors.push(`${row.id}: ${holdError.message}`)
          continue
        }

        const notify = await notifyStaffTicketOnHold({
          ticketId: row.id,
          ticketTitle: row.title,
          kind: kind as 'estimate' | 'work',
        })
        if (!notify.sent) errors.push(`${row.id}: ${notify.error}`)
        onHold += 1
      }
      continue
    }

    if (days >= APPROVAL_REMINDER_2_DAYS && count === 1) {
      const notify = await notifyClientApprovalReminder({
        ticketId: row.id,
        ticketTitle: row.title,
        clientId: row.client_id,
        kind,
        reminderNumber: 2,
        estimatedHours:
          kind === 'estimate' && row.estimated_hours != null
            ? Number(row.estimated_hours)
            : undefined,
      })
      if (!notify.sent) {
        errors.push(`${row.id}: ${notify.error}`)
        continue
      }

      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          approval_reminder_count: 2,
          approval_reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      if (updateError) errors.push(`${row.id}: ${updateError.message}`)
      else reminder2 += 1
      continue
    }

    if (days >= APPROVAL_REMINDER_1_DAYS && count === 0) {
      const notify = await notifyClientApprovalReminder({
        ticketId: row.id,
        ticketTitle: row.title,
        clientId: row.client_id,
        kind,
        reminderNumber: 1,
        estimatedHours:
          kind === 'estimate' && row.estimated_hours != null
            ? Number(row.estimated_hours)
            : undefined,
      })
      if (!notify.sent) {
        errors.push(`${row.id}: ${notify.error}`)
        continue
      }

      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          approval_reminder_count: 1,
          approval_reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      if (updateError) errors.push(`${row.id}: ${updateError.message}`)
      else reminder1 += 1
    }
  }

  const { data: extraRows, error: extraError } = await supabase
    .from('ticket_extra_hours')
    .select('id, ticket_id, minutes, submitted_at, reminder_count, tickets(title, client_id)')
    .eq('status', 'pending_approval')

  if (extraError) throw new Error(extraError.message)

  for (const row of extraRows ?? []) {
    const ticket = row.tickets as unknown as {
      title: string
      client_id: string
    } | null
    if (!ticket) continue
    if (remindersDisabled.has(ticket.client_id)) continue

    const days = daysSincePending(row.submitted_at)
    const count = row.reminder_count ?? 0
    const hours = Math.round((row.minutes / 60) * 100) / 100

    if (days >= APPROVAL_REMINDER_2_DAYS && count === 1) {
      const notify = await notifyClientApprovalReminder({
        ticketId: row.ticket_id,
        ticketTitle: ticket.title,
        clientId: ticket.client_id,
        kind: 'extra_hours',
        reminderNumber: 2,
        extraHours: hours,
      })
      if (!notify.sent) {
        errors.push(`extra:${row.id}: ${notify.error}`)
        continue
      }

      const { error: updateError } = await supabase
        .from('ticket_extra_hours')
        .update({
          reminder_count: 2,
          reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      if (updateError) errors.push(`extra:${row.id}: ${updateError.message}`)
      else extraReminder2 += 1
      continue
    }

    if (days >= APPROVAL_REMINDER_1_DAYS && count === 0) {
      const notify = await notifyClientApprovalReminder({
        ticketId: row.ticket_id,
        ticketTitle: ticket.title,
        clientId: ticket.client_id,
        kind: 'extra_hours',
        reminderNumber: 1,
        extraHours: hours,
      })
      if (!notify.sent) {
        errors.push(`extra:${row.id}: ${notify.error}`)
        continue
      }

      const { error: updateError } = await supabase
        .from('ticket_extra_hours')
        .update({
          reminder_count: 1,
          reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      if (updateError) errors.push(`extra:${row.id}: ${updateError.message}`)
      else extraReminder1 += 1
    }
  }

  return {
    checked: (tickets?.length ?? 0) + (extraRows?.length ?? 0),
    reminder1,
    reminder2,
    onHold,
    extraReminder1,
    extraReminder2,
    errors,
  }
}

export function approvalReminderResetPatch() {
  return {
    approval_reminder_count: 0,
    approval_reminder_sent_at: null,
    on_hold_at: null,
  }
}
