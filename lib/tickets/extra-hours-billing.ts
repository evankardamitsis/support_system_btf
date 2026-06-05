import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type AdminClient = SupabaseClient<Database>

export async function billApprovedExtraHoursForTicket(
  admin: AdminClient,
  ticketId: string
): Promise<{ billedMinutes: number }> {
  const { data: requests, error } = await admin
    .from('ticket_extra_hours')
    .select('id, retainer_id, agent_id, minutes, note')
    .eq('ticket_id', ticketId)
    .eq('status', 'approved')
    .is('hours_log_id', null)

  if (error) throw new Error(error.message)

  let billedMinutes = 0

  for (const request of requests ?? []) {
    const { data: hoursLog, error: logErr } = await admin
      .from('hours_log')
      .insert({
        ticket_id: ticketId,
        retainer_id: request.retainer_id,
        agent_id: request.agent_id,
        minutes: request.minutes,
        note: request.note ?? 'Extra hours (client approved)',
        is_extra: true,
      })
      .select('id')
      .single()

    if (logErr || !hoursLog) {
      throw new Error(logErr?.message ?? 'Could not record extra hours')
    }

    const { error: updateErr } = await admin
      .from('ticket_extra_hours')
      .update({ hours_log_id: hoursLog.id })
      .eq('id', request.id)
      .is('hours_log_id', null)

    if (updateErr) throw new Error(updateErr.message)

    billedMinutes += request.minutes
  }

  return { billedMinutes }
}
