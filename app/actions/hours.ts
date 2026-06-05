'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { assertClientCanUseRetainer } from '@/lib/retainers/guards'
import { isTicketClosed } from '@/lib/tickets/closed'

export async function logHours(
  ticketId: string,
  retainerId: string,
  minutes: number,
  note?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ticket } = await supabase
    .from('tickets')
    .select('client_id, status')
    .eq('id', ticketId)
    .single()

  if (!ticket?.client_id) throw new Error('Ticket not found')
  if (isTicketClosed(ticket.status)) {
    throw new Error('Cannot log hours on a closed ticket')
  }
  await assertClientCanUseRetainer(supabase, ticket.client_id)

  const { error } = await supabase.from('hours_log').insert({
    ticket_id: ticketId,
    retainer_id: retainerId,
    agent_id: user.id,
    minutes,
    note: note ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/admin/tickets')
  revalidatePath('/admin/retainers')
  revalidatePath('/admin/clients')
}
