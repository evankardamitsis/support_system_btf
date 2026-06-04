'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function startNewPeriod(
  clientId: string,
  hoursTotal: number,
  periodStart: string,
  periodEnd: string
): Promise<string> {
  const supabase = await createClient()

  const { data: retainer, error } = await supabase
    .from('retainers')
    .insert({
      client_id: clientId,
      hours_total: hoursTotal,
      period_start: periodStart,
      period_end: periodEnd,
    })
    .select('id')
    .single()

  if (error || !retainer) throw new Error(error?.message ?? 'Failed to create retainer period')

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/retainers')
  return retainer.id
}
