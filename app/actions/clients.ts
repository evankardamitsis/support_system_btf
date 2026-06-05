'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { insertRetainerPeriod } from '@/lib/retainers/insert-period'
import { currentBillingPeriod } from '@/lib/retainers/period'
import { isHoursBasedPackage, packageLabel } from '@/lib/retainers/billing-model'
import { parseRetainerPackage, type RetainerPackage } from '@/lib/retainers/packages'

export type DeleteClientResult = { ok: true } | { ok: false; error: string }

function parsePackage(raw: string | null): RetainerPackage {
  return parseRetainerPackage(raw)
}

export async function createClientAction(formData: FormData): Promise<string> {
  const supabase = await createClient()

  const packageName = parsePackage(formData.get('package_name') as string)
  const planLabel = packageLabel(packageName)
  const billingCycleDay = parseInt(formData.get('billing_cycle_day') as string, 10) || 1

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      contact_name: (formData.get('contact_name') as string) || null,
      plan_name: planLabel,
      billing_cycle_day: billingCycleDay,
      sla_response_hours: parseInt(formData.get('sla_response_hours') as string, 10) || 8,
    })
    .select('id')
    .single()

  if (error || !client) throw new Error(error?.message ?? 'Failed to create client')

  const hoursTotal = parseFloat(formData.get('hours_total') as string)
  const periodCost = parseFloat(formData.get('period_cost') as string)
  const useCustomDates = formData.get('use_custom_dates') === 'true'

  const hoursLimited = isHoursBasedPackage(packageName)
  const shouldCreatePeriod =
    (hoursLimited && hoursTotal && hoursTotal > 0) ||
    (!hoursLimited && periodCost && periodCost > 0)

  if (shouldCreatePeriod) {
    const { period_start, period_end } = useCustomDates
      ? {
          period_start: formData.get('period_start') as string,
          period_end: formData.get('period_end') as string,
        }
      : currentBillingPeriod(billingCycleDay)

    if (period_start && period_end) {
      await insertRetainerPeriod(supabase, {
        clientId: client.id,
        packageName,
        hoursTotal: hoursLimited ? hoursTotal : 0,
        periodCost: Number.isNaN(periodCost) ? 0 : periodCost,
        periodStart: period_start,
        periodEnd: period_end,
        sendClientEmail: true,
      })
    }
  }

  return client.id
}

export async function generateInviteLink(clientId: string): Promise<string> {
  const supabase = await createClient()

  const { data: token, error } = await supabase
    .from('invite_tokens')
    .insert({ client_id: clientId })
    .select('token')
    .single()

  if (error || !token) throw new Error(error?.message ?? 'Failed to create invite token')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${baseUrl}/auth/register?token=${token.token}`
}

export async function deleteClient(clientId: string): Promise<DeleteClientResult> {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return { ok: false, error: 'Only admins can delete clients' }
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return { ok: false, error: adminResult.error }
  }
  const admin = adminResult.client

  const { data: portalUsers, error: usersError } = await admin
    .from('users')
    .select('id')
    .eq('client_id', clientId)
    .eq('role', 'client')

  if (usersError) {
    return { ok: false, error: usersError.message }
  }

  for (const portalUser of portalUsers ?? []) {
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(portalUser.id)
    if (authDeleteError) {
      return { ok: false, error: authDeleteError.message }
    }
  }

  const { error } = await admin.from('clients').delete().eq('id', clientId)
  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/clients')
  revalidatePath('/admin/tickets')
  revalidatePath('/admin/retainers')
  return { ok: true }
}
