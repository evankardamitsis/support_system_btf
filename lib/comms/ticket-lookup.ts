import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { formatTicketId } from '@/lib/tickets/display'

type Db = SupabaseClient<Database>

export type TicketLookupResult = {
  id: string
  title: string
  status: string
  assignedTo: string | null
}

function normalizeTicketRef(ref: string) {
  const trimmed = ref.trim()
  if (!trimmed) return null

  const upper = trimmed.toUpperCase()
  if (upper.startsWith('TKT-')) {
    return upper.slice(4)
  }

  return trimmed
}

export async function lookupTicketByRef(
  supabase: Db,
  ref: string
): Promise<TicketLookupResult | null> {
  const normalized = normalizeTicketRef(ref)
  if (!normalized) return null

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(normalized)) {
    const { data } = await supabase
      .from('tickets')
      .select('id, title, status, assigned_to')
      .eq('id', normalized)
      .maybeSingle()
    return data
      ? {
          id: data.id,
          title: data.title,
          status: data.status,
          assignedTo: data.assigned_to,
        }
      : null
  }

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, title, status, assigned_to')
    .ilike('id', `${normalized}%`)
    .order('updated_at', { ascending: false })
    .limit(5)

  if (!tickets?.length) return null
  if (tickets.length === 1) {
    const ticket = tickets[0]
    return {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      assignedTo: ticket.assigned_to,
    }
  }

  const exact = tickets.find(ticket => formatTicketId(ticket.id).toUpperCase() === `TKT-${normalized}`)
  if (!exact) return null

  return {
    id: exact.id,
    title: exact.title,
    status: exact.status,
    assignedTo: exact.assigned_to,
  }
}
