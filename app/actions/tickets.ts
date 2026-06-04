'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { TicketStatus, TicketPriority } from '@/lib/types'

export async function createTicket(formData: FormData): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      client_id: formData.get('client_id') as string,
      created_by: user.id,
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || null,
      type: ((formData.get('type') as string) || 'task') as 'bug' | 'task' | 'request' | 'question',
      priority: ((formData.get('priority') as string) || 'normal') as 'low' | 'normal' | 'high' | 'critical',
    })
    .select('id')
    .single()

  if (error || !ticket) throw new Error(error?.message ?? 'Failed to create ticket')
  return ticket.id
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', ticketId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/admin/tickets')
}

export async function updateTicketAssignee(ticketId: string, agentId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tickets')
    .update({ assigned_to: agentId })
    .eq('id', ticketId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/tickets/${ticketId}`)
}

export async function updateTicketPriority(ticketId: string, priority: TicketPriority) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tickets')
    .update({ priority })
    .eq('id', ticketId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/admin/tickets')
}
