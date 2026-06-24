'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { authorDisplayName } from '@/lib/comments/authors'
import { parseMentionedUserIds } from '@/lib/comments/mentions'
import { notifyStaffInternalMention } from '@/lib/email/ticket-notifications'
import { notifyMentionedStaff } from '@/lib/ops/notifications/service'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { formatTicketId } from '@/lib/tickets/display'
import { isTicketClosed, TICKET_LOCKED_MESSAGE } from '@/lib/tickets/closed'

export type StaffMentionOption = { id: string; name: string }

export async function getStaffForMentions(): Promise<StaffMentionOption[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'agent'].includes(profile.role)) {
    return []
  }

  const { data: staff } = await supabase
    .from('users')
    .select('id, full_name')
    .in('role', ['admin', 'agent'])
    .not('full_name', 'is', null)

  return (staff ?? [])
    .map(s => ({ id: s.id, name: s.full_name!.trim() }))
    .filter(s => s.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function addComment(ticketId: string, body: string, isInternal: boolean): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ticket } = await supabase
    .from('tickets')
    .select('status, title')
    .eq('id', ticketId)
    .single()
  if (!ticket) throw new Error('Ticket not found')
  if (isTicketClosed(ticket.status)) {
    throw new Error(TICKET_LOCKED_MESSAGE)
  }

  const { data: inserted, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      body,
      is_internal: isInternal,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  const commentId = inserted.id

  if (isInternal) {
    const [{ data: author }, staff] = await Promise.all([
      supabase.from('users').select('full_name, role').eq('id', user.id).single(),
      getStaffForMentions(),
    ])

    const authorName = authorDisplayName(author)
    const mentionedIds = parseMentionedUserIds(body, staff).filter(id => id !== user.id)
    if (mentionedIds.length > 0) {
      const ticketRef = formatTicketId(ticketId)
      const adminResult = tryCreateAdminClient()
      if (!('error' in adminResult)) {
        await notifyMentionedStaff(adminResult.client, {
          mentionedUserIds: mentionedIds,
          authorUserId: user.id,
          authorName,
          excerpt: body,
          href: `/admin/tickets/${ticketId}`,
          contextLabel: `${ticketRef} · ${ticket.title}`,
          dedupeKey: `mention:ticket:${ticketId}:${inserted.id}`,
        })
      }

      const notify = await notifyStaffInternalMention({
        ticketId,
        ticketTitle: ticket.title,
        mentionedUserIds: mentionedIds,
        authorName,
        excerpt: body,
      })
      if (!notify.sent) {
        console.error('[email] staff internal-mention notification failed:', notify.error)
      }
    }
  }

  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath(`/portal/tickets/${ticketId}`)
  return commentId
}
