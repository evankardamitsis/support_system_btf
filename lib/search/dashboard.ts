import type { SupabaseClient } from '@supabase/supabase-js'

export type TicketSearchHit = { id: string; title: string; status: string }
export type ClientSearchHit = { id: string; name: string; email: string }

/** PostgreSQL ILIKE wildcard escape for user input */
export function ilikePattern(term: string) {
  const escaped = term.replace(/[%_\\]/g, ch => `\\${ch}`)
  return `%${escaped}%`
}

export function mergeById<T extends { id: string }>(rows: T[], limit: number) {
  const seen = new Map<string, T>()
  for (const row of rows) {
    if (!seen.has(row.id)) seen.set(row.id, row)
    if (seen.size >= limit) break
  }
  return [...seen.values()]
}

export async function searchTickets(
  supabase: SupabaseClient,
  term: string,
  limit = 8
): Promise<TicketSearchHit[]> {
  const pattern = ilikePattern(term)
  const select = 'id, title, status' as const

  const [byTitle, byDescription] = await Promise.all([
    supabase
      .from('tickets')
      .select(select)
      .ilike('title', pattern)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('tickets')
      .select(select)
      .ilike('description', pattern)
      .order('updated_at', { ascending: false })
      .limit(limit),
  ])

  if (byTitle.error) throw byTitle.error
  if (byDescription.error) throw byDescription.error

  return mergeById(
    [...(byTitle.data ?? []), ...(byDescription.data ?? [])],
    limit
  )
}

export async function searchClients(
  supabase: SupabaseClient,
  term: string,
  limit = 6
): Promise<ClientSearchHit[]> {
  const pattern = ilikePattern(term)
  const select = 'id, name, email' as const

  const [byName, byEmail] = await Promise.all([
    supabase.from('clients').select(select).ilike('name', pattern).order('name').limit(limit),
    supabase.from('clients').select(select).ilike('email', pattern).order('name').limit(limit),
  ])

  if (byName.error) throw byName.error
  if (byEmail.error) throw byEmail.error

  return mergeById([...(byName.data ?? []), ...(byEmail.data ?? [])], limit)
}
