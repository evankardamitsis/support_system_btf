import { sendHostingRenewalReminder } from '@/lib/email/hosting-maintenance-renewal'
import { daysUntilExpiry } from '@/lib/ops/hosting-maintenance/display'
import { getHostingContract } from '@/lib/ops/hosting-maintenance/service'
import { HOSTING_RENEWAL_REMINDER_DAYS } from '@/lib/ops/hosting-maintenance/types'
import { tryCreateAdminClient } from '@/lib/supabase/admin'

export async function processHostingRenewalReminders(): Promise<{
  checked: number
  sent: number
  expired: number
  errors: string[]
}> {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return { checked: 0, sent: 0, expired: 0, errors: [adminResult.error] }
  }
  const supabase = adminResult.client
  const today = new Date().toISOString().slice(0, 10)

  const { data: contracts, error } = await supabase
    .from('ops_hosting_contracts')
    .select('id, period_end, status, renewal_notified_at')
    .eq('status', 'active')

  if (error) throw new Error(error.message)

  let sent = 0
  let expired = 0
  const errors: string[] = []

  for (const row of contracts ?? []) {
    if (row.period_end < today) {
      const { error: updateError } = await supabase
        .from('ops_hosting_contracts')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', row.id)

      if (updateError) errors.push(`${row.id}: ${updateError.message}`)
      else expired += 1
      continue
    }

    const days = daysUntilExpiry(row.period_end)
    if (days > HOSTING_RENEWAL_REMINDER_DAYS || row.renewal_notified_at) continue

    const contract = await getHostingContract(supabase, row.id)
    if (!contract) continue

    const result = await sendHostingRenewalReminder(contract)
    if (!result.sent) {
      errors.push(`${row.id}: ${result.error}`)
      continue
    }

    const { error: notifyError } = await supabase
      .from('ops_hosting_contracts')
      .update({
        renewal_notified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (notifyError) errors.push(`${row.id}: ${notifyError.message}`)
    else sent += 1
  }

  return { checked: contracts?.length ?? 0, sent, expired, errors }
}
