import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type RetainerRow = {
  id: string
  period_start: string
  period_end: string
  hours_total: number
  hours_used: number
  package_name?: string
  period_cost?: number
  hours_limited?: boolean
}

type Db = SupabaseClient<Database>

async function fetchByDateRange(
  supabase: Db,
  clientId: string,
  inRange: boolean
): Promise<RetainerRow | null> {
  const today = new Date().toISOString().slice(0, 10)
  let query = supabase
    .from('retainers')
    .select('id, period_start, period_end, hours_total, hours_used')
    .eq('client_id', clientId)
    .order('period_end', { ascending: false })
    .limit(1)

  if (inRange) {
    query = query.lte('period_start', today).gte('period_end', today)
  }

  const { data } = await query.maybeSingle()
  return (data as RetainerRow | null) ?? null
}

async function fetchByDateRangeWithPackage(
  supabase: Db,
  clientId: string,
  inRange: boolean
): Promise<RetainerRow | null> {
  const today = new Date().toISOString().slice(0, 10)
  let query = supabase
    .from('retainers')
    .select('id, period_start, period_end, hours_total, hours_used, package_name, hours_limited')
    .eq('client_id', clientId)
    .order('period_end', { ascending: false })
    .limit(1)

  if (inRange) {
    query = query.lte('period_start', today).gte('period_end', today)
  }

  const { data } = await query.maybeSingle()
  return (data as RetainerRow | null) ?? null
}

async function fetchByDateRangeAdmin(
  supabase: Db,
  clientId: string,
  inRange: boolean
): Promise<RetainerRow | null> {
  const today = new Date().toISOString().slice(0, 10)
  let query = supabase
    .from('retainers')
    .select('id, period_start, period_end, hours_total, hours_used, package_name, period_cost, hours_limited')
    .eq('client_id', clientId)
    .order('period_end', { ascending: false })
    .limit(1)

  if (inRange) {
    query = query.lte('period_start', today).gte('period_end', today)
  }

  const { data } = await query.maybeSingle()
  return (data as RetainerRow | null) ?? null
}

/** Active retainer period for a client (current date in range, else latest period). */
export async function getRetainerForClient(
  supabase: Db,
  clientId: string,
  options?: { includeCost?: boolean; includePackage?: boolean }
): Promise<RetainerRow | null> {
  const fetch =
    options?.includeCost === true
      ? fetchByDateRangeAdmin
      : options?.includePackage === true
        ? fetchByDateRangeWithPackage
        : fetchByDateRange

  const current = await fetch(supabase, clientId, true)
  if (current) return current
  return fetch(supabase, clientId, false)
}
