'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { insertRetainerPeriod } from '@/lib/retainers/insert-period'
import { currentBillingPeriod } from '@/lib/retainers/period'
import { isHoursBasedPackage } from '@/lib/retainers/billing-model'
import { parseRetainerPackage, type RetainerPackage } from '@/lib/retainers/packages'
import type { RetainerLifecycleStatus } from '@/lib/retainers/status'
import {
  fetchClientRetainerTableDetail,
  type RetainerTableDetail,
} from '@/lib/retainers/ticket-table-detail'
import { renewClientRetainerIfDue } from '@/lib/retainers/renew'

export type DeleteRetainerResult = { ok: true } | { ok: false; error: string }

function parsePackage(raw: string | null): RetainerPackage {
  return parseRetainerPackage(raw)
}

function revalidateClientRetainerPaths(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/retainers')
  revalidatePath('/admin/clients')
  revalidatePath('/admin/tickets')
  revalidatePath('/portal/retainer')
  revalidatePath('/portal/tickets/new')
}

async function requireAdminClient() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) throw new Error('Only admins can manage retainer lifecycle')
  return createClient()
}

async function setRetainerStatus(
  clientId: string,
  status: RetainerLifecycleStatus
): Promise<void> {
  const supabase = await requireAdminClient()
  const now = new Date().toISOString()

  const patch: {
    retainer_status: RetainerLifecycleStatus
    retainer_frozen_at: string | null
    retainer_canceled_at: string | null
  } = {
    retainer_status: status,
    retainer_frozen_at: status === 'frozen' ? now : null,
    retainer_canceled_at: status === 'canceled' ? now : null,
  }

  if (status === 'active') {
    patch.retainer_frozen_at = null
    patch.retainer_canceled_at = null
  }

  const { error } = await supabase.from('clients').update(patch).eq('id', clientId)
  if (error) throw new Error(error.message)
  revalidateClientRetainerPaths(clientId)
}

export async function createRetainerPeriod(formData: FormData): Promise<string> {
  const supabase = await createClient()

  const clientId = formData.get('client_id') as string
  const packageName = parsePackage(formData.get('package_name') as string)
  const hoursLimited = isHoursBasedPackage(packageName)
  const hoursTotal = hoursLimited ? parseFloat(formData.get('hours_total') as string) : 0
  const periodCost = parseFloat(formData.get('period_cost') as string)
  const billingDay = parseInt(formData.get('billing_cycle_day') as string, 10) || 1

  if (!clientId) {
    throw new Error('Client is required')
  }
  if (hoursLimited && (!hoursTotal || hoursTotal <= 0 || Number.isNaN(hoursTotal))) {
    throw new Error('Monthly hours are required')
  }
  if (Number.isNaN(periodCost) || periodCost <= 0) {
    throw new Error('Period cost is required')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('retainer_status')
    .eq('id', clientId)
    .single()

  const status = (client?.retainer_status ?? 'active') as RetainerLifecycleStatus
  if (status === 'frozen') {
    throw new Error('Unfreeze the retainer before starting a new period')
  }
  if (status === 'canceled') {
    throw new Error('Resume the retainer before starting a new period')
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

  const { id } = await insertRetainerPeriod(supabase, {
    clientId,
    packageName,
    hoursTotal,
    periodCost,
    periodStart: period_start,
    periodEnd: period_end,
    sendClientEmail: true,
  })

  revalidateClientRetainerPaths(clientId)
  return id
}

export async function freezeRetainer(clientId: string): Promise<void> {
  await setRetainerStatus(clientId, 'frozen')
}

export async function unfreezeRetainer(clientId: string): Promise<void> {
  const supabase = await requireAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('retainer_status')
    .eq('id', clientId)
    .single()

  if (client?.retainer_status !== 'frozen') {
    throw new Error('Retainer is not frozen')
  }

  await setRetainerStatus(clientId, 'active')
}

export async function cancelRetainer(clientId: string): Promise<void> {
  await setRetainerStatus(clientId, 'canceled')
}

export async function resumeRetainer(clientId: string): Promise<void> {
  const supabase = await requireAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('retainer_status')
    .eq('id', clientId)
    .single()

  if (client?.retainer_status !== 'canceled') {
    throw new Error('Retainer is not canceled')
  }

  await setRetainerStatus(clientId, 'active')
}

/** Permanently remove all retainer periods and clear this client's plan. */
export async function deleteClientRetainer(clientId: string): Promise<DeleteRetainerResult> {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return { ok: false, error: 'Only admins can delete retainers' }
  }

  if (!clientId) {
    return { ok: false, error: 'Client is required' }
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return { ok: false, error: adminResult.error }
  }
  const admin = adminResult.client

  const { data: periods, error: periodsError } = await admin
    .from('retainers')
    .select('id')
    .eq('client_id', clientId)

  if (periodsError) {
    return { ok: false, error: periodsError.message }
  }

  if (!periods?.length) {
    return { ok: false, error: 'This client has no retainer periods to delete' }
  }

  const retainerIds = periods.map(period => period.id)

  const { error: extraHoursError } = await admin
    .from('ticket_extra_hours')
    .delete()
    .in('retainer_id', retainerIds)

  if (extraHoursError) {
    return { ok: false, error: extraHoursError.message }
  }

  const { error: deleteError } = await admin.from('retainers').delete().eq('client_id', clientId)

  if (deleteError) {
    return { ok: false, error: deleteError.message }
  }

  const { error: clientError } = await admin
    .from('clients')
    .update({
      plan_name: null,
      renewal_date: null,
      retainer_status: 'active',
      retainer_frozen_at: null,
      retainer_canceled_at: null,
    })
    .eq('id', clientId)

  if (clientError) {
    return { ok: false, error: clientError.message }
  }

  revalidateClientRetainerPaths(clientId)
  revalidatePath('/admin/tickets')
  return { ok: true }
}

export async function getClientRetainerTableDetail(
  clientId: string
): Promise<RetainerTableDetail | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'agent') {
    throw new Error('Unauthorized')
  }

  return fetchClientRetainerTableDetail(supabase, clientId)
}

export async function renewClientRetainerNow(clientId: string) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) throw new Error('Only admins can renew retainer periods')

  const result = await renewClientRetainerIfDue(clientId)
  if (!result.ok) throw new Error(result.error)
  if (result.renewed) revalidateClientRetainerPaths(clientId)
  return result
}
