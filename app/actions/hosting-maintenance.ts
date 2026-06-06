'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth/require-staff'
import { sendHostingRenewalReminder } from '@/lib/email/hosting-maintenance-renewal'
import { computeRenewedPeriod } from '@/lib/ops/hosting-maintenance/period'
import {
  getHostingContract,
  listHostingContracts,
  parseHostingContractInput,
} from '@/lib/ops/hosting-maintenance/service'
import type { HostingContractRecord } from '@/lib/ops/hosting-maintenance/types'

function revalidateHostingPaths() {
  revalidatePath('/admin/ops/hosting-maintenance')
  revalidatePath('/admin/ops/hosting-maintenance/new')
}

export async function fetchHostingContracts(): Promise<HostingContractRecord[]> {
  const { supabase } = await requireStaff()
  return listHostingContracts(supabase)
}

export async function fetchHostingContract(id: string): Promise<HostingContractRecord | null> {
  const { supabase } = await requireStaff()
  return getHostingContract(supabase, id)
}

export async function createHostingContract(raw: unknown): Promise<string> {
  const { supabase, user } = await requireStaff()
  const input = parseHostingContractInput(raw)

  const { data, error } = await supabase
    .from('ops_hosting_contracts')
    .insert({
      name: input.name,
      client_id: input.clientId,
      period_type: input.periodType,
      custom_period: input.customPeriod,
      cost_amount: input.costAmount,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      notes: input.notes,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidateHostingPaths()
  return data.id
}

export async function updateHostingContract(id: string, raw: unknown): Promise<void> {
  const { supabase } = await requireStaff()
  const input = parseHostingContractInput(raw)

  const { error } = await supabase
    .from('ops_hosting_contracts')
    .update({
      name: input.name,
      client_id: input.clientId,
      period_type: input.periodType,
      custom_period: input.customPeriod,
      cost_amount: input.costAmount,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidateHostingPaths()
  revalidatePath(`/admin/ops/hosting-maintenance/${id}`)
}

export async function cancelHostingContract(id: string): Promise<void> {
  const { supabase } = await requireStaff()
  const { error } = await supabase
    .from('ops_hosting_contracts')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidateHostingPaths()
  revalidatePath(`/admin/ops/hosting-maintenance/${id}`)
}

export async function renewHostingContract(id: string): Promise<void> {
  const { supabase } = await requireStaff()
  const contract = await getHostingContract(supabase, id)
  if (!contract) throw new Error('Contract not found')

  const next = computeRenewedPeriod({
    periodStart: contract.periodStart,
    periodEnd: contract.periodEnd,
    periodType: contract.periodType,
  })

  const { error } = await supabase
    .from('ops_hosting_contracts')
    .update({
      period_start: next.periodStart,
      period_end: next.periodEnd,
      status: 'active',
      renewal_notified_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidateHostingPaths()
  revalidatePath(`/admin/ops/hosting-maintenance/${id}`)
}

export async function sendHostingContractRenewalReminder(id: string): Promise<void> {
  const { supabase } = await requireStaff()
  const contract = await getHostingContract(supabase, id)
  if (!contract) throw new Error('Contract not found')
  if (contract.status !== 'active') throw new Error('Only active contracts can receive renewal reminders')

  const result = await sendHostingRenewalReminder(contract)
  if (!result.sent) throw new Error(result.error)

  const { error } = await supabase
    .from('ops_hosting_contracts')
    .update({
      renewal_notified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidateHostingPaths()
  revalidatePath(`/admin/ops/hosting-maintenance/${id}`)
}
