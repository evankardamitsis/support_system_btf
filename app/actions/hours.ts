'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function logHours(
  ticketId: string,
  retainerId: string,
  minutes: number,
  note?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase.from('hours_log').insert({
    ticket_id: ticketId,
    retainer_id: retainerId,
    agent_id: user.id,
    minutes,
    note: note ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/admin/retainers')
}
