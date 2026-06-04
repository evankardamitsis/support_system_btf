'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addComment(ticketId: string, body: string, isInternal: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

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
