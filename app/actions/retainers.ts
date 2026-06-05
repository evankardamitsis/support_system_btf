'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { notifyClientNewRetainer } from '@/lib/email/ticket-notifications'
import { currentBillingPeriod, renewalDateFromPeriodEnd } from '@/lib/retainers/period'
import type { RetainerPackage } from '@/lib/retainers/packages'

function parsePackage(raw: string | null): RetainerPackage {
  return raw === 'grow' ? 'grow' : 'care'
}

export async function createRetainerPeriod(formData: FormData): Promise<string> {
  const supabase = await createClient()

  const clientId = formData.get('client_id') as string
  const packageName = parsePackage(formData.get('package_name') as string)
  const hoursTotal = parseFloat(formData.get('hours_total') as string)
  const periodCost = parseFloat(formData.get('period_cost') as string)
  const billingDay = parseInt(formData.get('billing_cycle_day') as string, 10) || 1

  if (!clientId || !hoursTotal || hoursTotal <= 0 || Number.isNaN(hoursTotal)) {
    throw new Error('Monthly hours are required')
  }
  if (Number.isNaN(periodCost) || periodCost < 0) {
    throw new Error('Contract value must be zero or greater')
  }

  const useCustomDates = formData.get('use_custom_dates') === 'true'
  const { period_start, period_end } = useCustomDates
    ? {
        period_start: formData.get('period_start') as string,
        period_end: formData.get('period_end') as string,
      }
    : currentBillingPeriod(billingDay)

  if (!period_start || !period_end) {
    throw new Error('Billing period dates are required')
  }

  const packageLabel = packageName === 'grow' ? 'Grow' : 'Care'

  const { data: retainer, error } = await supabase
    .from('retainers')
    .insert({
      client_id: clientId,
      package_name: packageName,
      period_start,
      period_end,
      hours_total: hoursTotal,
      period_cost: Math.round(periodCost * 100) / 100,
    })
    .select('id')
    .single()

  if (error || !retainer) throw new Error(error?.message ?? 'Failed to create retainer period')

  await supabase
    .from('clients')
    .update({
      plan_name: packageLabel,
      renewal_date: renewalDateFromPeriodEnd(period_end),
    })
    .eq('id', clientId)

  const clientNotify = await notifyClientNewRetainer({
    clientId,
    packageName,
    hoursTotal,
    periodStart: period_start,
    periodEnd: period_end,
  })
  if (!clientNotify.sent) {
    console.error('[email] client new-retainer notification failed:', clientNotify.error)
  }

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/retainers')
  revalidatePath('/admin/clients')
  return retainer.id
}
