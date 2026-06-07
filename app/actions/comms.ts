'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { lookupTicketByRef } from '@/lib/comms/ticket-lookup'
import { resolveStatusAlias } from '@/lib/comms/slash-commands'
import { resolveAssigneeFromArg } from '@/lib/comms/mention-utils'
import { notifyMentionedStaff } from '@/lib/ops/notifications/service'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { formatTicketId } from '@/lib/tickets/display'
import { updateTicketAssignee, updateTicketStatus } from '@/app/actions/tickets'
import { addComment } from '@/app/actions/comments'
import type { StreamStaffMember } from '@/lib/comms/stream-server'
import type { TicketStatus } from '@/lib/types'

async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'agent'].includes(profile.role)) {
    throw new Error('Forbidden')
  }

  return {
    supabase,
    user,
    profile,
    authorName: profile.full_name?.trim() || 'Team member',
  }
}

export async function commsLookupTicket(ref: string) {
  const { supabase } = await requireStaff()
  const ticket = await lookupTicketByRef(supabase, ref)
  if (!ticket) return null

  return {
    id: ticket.id,
    title: ticket.title,
    status: ticket.status,
    assignedTo: ticket.assignedTo,
    displayId: formatTicketId(ticket.id),
  }
}

export async function commsAssignTicket(ticketId: string, assigneeArg: string) {
  const { supabase, user, profile } = await requireStaff()
  const { data: staffRows } = await supabase
    .from('users')
    .select('id, full_name')
    .in('role', ['admin', 'agent'])

  const staff: StreamStaffMember[] = (staffRows ?? []).map(row => ({
    id: row.id,
    name: row.full_name?.trim() || 'Team member',
  }))

  const normalized = assigneeArg.trim().toLowerCase().replace(/^@/, '')
  const assignee =
    !normalized || normalized === 'me' || normalized === 'self'
      ? {
          id: user.id,
          name: profile.full_name?.trim() || 'Team member',
        }
      : resolveAssigneeFromArg(assigneeArg, staff)

  if (!assignee) throw new Error('Could not find that teammate')

  await updateTicketAssignee(ticketId, assignee.id)
  return { assigneeName: assignee.name }
}

export async function commsSetTicketStatus(ticketId: string, statusArg: string) {
  const status = resolveStatusAlias(statusArg)
  if (!status) throw new Error('Unknown status. Try open, in_progress, waiting, hold, resolved, or closed')

  await updateTicketStatus(ticketId, status as TicketStatus)
  return { status }
}

export async function commsCopyMessageToInternalNote(ticketId: string, body: string) {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('Message is empty')
  await addComment(ticketId, trimmed, true)
  revalidatePath(`/admin/tickets/${ticketId}`)
  return { ok: true }
}

export async function commsNotifyMentions(input: {
  mentionedUserIds: string[]
  channelId: string
  channelLabel: string
  ticketId?: string | null
  excerpt: string
  messageId: string
}) {
  const { user, authorName } = await requireStaff()
  const recipients = [...new Set(input.mentionedUserIds.filter(id => id && id !== user.id))]
  if (!recipients.length) return { ok: true }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) return { ok: false }

  const href = input.ticketId
    ? `/admin/tickets/${input.ticketId}?commsChannel=${encodeURIComponent(input.channelId)}`
    : `/admin/tickets?commsChannel=${encodeURIComponent(input.channelId)}`

  await notifyMentionedStaff(adminResult.client, {
    mentionedUserIds: recipients,
    authorUserId: user.id,
    authorName,
    excerpt: input.excerpt,
    href,
    contextLabel: input.channelLabel,
    dedupeKey: `comms-mention:${input.channelId}:${input.messageId}`,
  })

  return { ok: true }
}

export async function commsCreateReminder(input: {
  channelId: string
  channelLabel: string
  ticketId?: string | null
  remindIn: string
  note: string
}) {
  const { user } = await requireStaff()
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) throw new Error('Could not create reminder')

  const href = input.ticketId
    ? `/admin/tickets/${input.ticketId}?commsChannel=${encodeURIComponent(input.channelId)}`
    : `/admin/tickets?commsChannel=${encodeURIComponent(input.channelId)}`

  const { insertOpsNotification } = await import('@/lib/ops/notifications/service')
  await insertOpsNotification(adminResult.client, {
    userId: user.id,
    type: 'mention',
    title: `Reminder (${input.remindIn})`,
    body: `${input.channelLabel} · ${input.note.trim()}`,
    href,
    dedupeKey: `comms-remind:${input.channelId}:${Date.now()}`,
  })

  return { ok: true }
}
