import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type Db = SupabaseClient<Database>

/** Split logged minutes between what fits in the current period's cap and what overflows it. */
export function splitOverageMinutes(
  totalMinutes: number,
  retainer: { hours_total: number; hours_used: number }
): { loggedMinutes: number; deferredMinutes: number } {
  const remainingMinutes = Math.max(
    0,
    Math.round((Number(retainer.hours_total) - Number(retainer.hours_used)) * 60)
  )
  const loggedMinutes = Math.min(totalMinutes, remainingMinutes)
  return { loggedMinutes, deferredMinutes: totalMinutes - loggedMinutes }
}

export type DeferOverageInput = {
  ticketId: string
  clientId: string
  agentId: string
  sourceRetainerId: string
  minutes: number
  note?: string | null
}

/** Queue hours that exceeded the current period's cap to bill against the next period instead. */
export async function deferOverageHours(supabase: Db, input: DeferOverageInput): Promise<void> {
  const { data: existing } = await supabase
    .from('deferred_hours')
    .select('id')
    .eq('ticket_id', input.ticketId)
    .limit(1)
    .maybeSingle()

  if (existing) return

  const { error } = await supabase.from('deferred_hours').insert({
    ticket_id: input.ticketId,
    client_id: input.clientId,
    agent_id: input.agentId,
    source_retainer_id: input.sourceRetainerId,
    minutes: input.minutes,
    note: input.note ?? null,
  })

  if (error) throw new Error(error.message)
}

/** Drain any pending deferred hours for a client into the retainer period that just started. */
export async function applyPendingDeferredHours(
  supabase: Db,
  clientId: string,
  newRetainerId: string
): Promise<void> {
  const { data: pending, error } = await supabase
    .from('deferred_hours')
    .select('id, ticket_id, agent_id, minutes, note')
    .eq('client_id', clientId)
    .is('applied_at', null)

  if (error) throw new Error(error.message)

  for (const row of pending ?? []) {
    const { data: hoursLog, error: logErr } = await supabase
      .from('hours_log')
      .insert({
        ticket_id: row.ticket_id,
        retainer_id: newRetainerId,
        agent_id: row.agent_id,
        minutes: row.minutes,
        note: row.note
          ? `Deferred from prior period — ${row.note}`
          : 'Deferred from prior period',
        is_extra: false,
      })
      .select('id')
      .single()

    if (logErr || !hoursLog) {
      throw new Error(logErr?.message ?? 'Could not apply deferred hours')
    }

    const { error: updateErr } = await supabase
      .from('deferred_hours')
      .update({ applied_at: new Date().toISOString(), hours_log_id: hoursLog.id })
      .eq('id', row.id)
      .is('applied_at', null)

    if (updateErr) throw new Error(updateErr.message)
  }
}
