'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isTicketClosed } from '@/lib/tickets/closed'

export async function addComment(ticketId: string, body: string, isInternal: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ticket } = await supabase
    .from('tickets')
    .select('status')
    .eq('id', ticketId)
    .single()
  if (!ticket) throw new Error('Ticket not found')
  if (isTicketClosed(ticket.status)) {
    throw new Error('Cannot add comments to a closed ticket')
  }

  const { error } = await supabase.from('ticket_comments').insert({
    ticket_id: ticketId,
    author_id: user.id,
    body,
    is_internal: isInternal,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath(`/portal/tickets/${ticketId}`)
}
