'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRetainerForClient } from '@/lib/retainers/active'
import type { TicketStatus, TicketPriority } from '@/lib/types'

async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'agent'].includes(profile.role)) {
    throw new Error('Not authorized')
  }
  return { supabase, user }
}

function revalidateTicketPaths(ticketId: string) {
  revalidatePath(`/admin/tickets/${ticketId}`)
  revalidatePath('/admin/tickets')
  revalidatePath('/admin/retainers')
}

export async function createTicket(formData: FormData): Promise<string> {
  const { supabase, user } = await requireStaff()

  const estRaw = formData.get('estimated_hours') as string | null
  const estimated =
    estRaw && estRaw.trim() !== '' ? parseFloat(estRaw) : null

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      client_id: formData.get('client_id') as string,
      created_by: user.id,
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || null,
      type: ((formData.get('type') as string) || 'task') as 'bug' | 'task' | 'request' | 'question',
      priority: ((formData.get('priority') as string) || 'normal') as TicketPriority,
      estimated_hours: estimated != null && !Number.isNaN(estimated) ? estimated : null,
    })
    .select('id')
    .single()

  if (error || !ticket) throw new Error(error?.message ?? 'Failed to create ticket')
  return ticket.id
}

export async function updateTicketPriority(ticketId: string, priority: TicketPriority) {
  const { supabase } = await requireStaff()
  const { error } = await supabase.from('tickets').update({ priority }).eq('id', ticketId)
  if (error) throw new Error(error.message)
  revalidateTicketPaths(ticketId)
}

export async function updateTicketEstimatedHours(ticketId: string, hours: number | null) {
  const { supabase } = await requireStaff()
  const value =
    hours != null && !Number.isNaN(hours) && hours >= 0 ? Math.round(hours * 100) / 100 : null
  const { error } = await supabase
    .from('tickets')
    .update({ estimated_hours: value })
    .eq('id', ticketId)
  if (error) throw new Error(error.message)
  revalidateTicketPaths(ticketId)
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const { supabase } = await requireStaff()

  if (status === 'resolved') {
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
  const patch: { status: TicketStatus; resolved_at?: string | null } = { status }
  if (status === 'closed') {
    patch.resolved_at = new Date().toISOString()
  } else if (status !== 'resolved') {
    patch.resolved_at = null
  }
  const { error } = await supabase.from('tickets').update(patch).eq('id', ticketId)
  if (error) throw new Error(error.message)
  revalidateTicketPaths(ticketId)
}

export async function resolveTicketWithHours(ticketId: string, actualHours: number) {
  const { supabase, user } = await requireStaff()

  if (!actualHours || actualHours <= 0 || Number.isNaN(actualHours)) {
    throw new Error('Enter actual hours spent (greater than 0)')
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select('id, client_id, status')
    .eq('id', ticketId)
    .single()

  if (ticketErr || !ticket) throw new Error(ticketErr?.message ?? 'Ticket not found')

  const { data: existingLog } = await supabase
    .from('hours_log')
    .select('id')
    .eq('ticket_id', ticketId)
    .limit(1)
    .maybeSingle()

  const retainer = await getRetainerForClient(supabase, ticket.client_id)
  if (!retainer) {
    throw new Error('No retainer period for this client — add a retainer before logging hours')
  }

  const minutes = Math.round(actualHours * 60)
  const now = new Date().toISOString()

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

  const { error: updateErr } = await supabase
    .from('tickets')
    .update({
      status: 'resolved',
      resolved_at: now,
      actual_hours: Math.round(actualHours * 100) / 100,
    })
    .eq('id', ticketId)

  if (updateErr) throw new Error(updateErr.message)
  revalidateTicketPaths(ticketId)
}

export async function updateTicketAssignee(ticketId: string, agentId: string | null) {
  const { supabase } = await requireStaff()
  const { error } = await supabase
    .from('tickets')
    .update({ assigned_to: agentId })
    .eq('id', ticketId)
  if (error) throw new Error(error.message)
  revalidateTicketPaths(ticketId)
}
