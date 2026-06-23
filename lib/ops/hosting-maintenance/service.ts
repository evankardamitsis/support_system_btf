import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  isHostingMaintenancePeriod,
  type HostingMaintenancePeriod,
} from '@/lib/ops/financial-offer/types'
import type { HostingContractRecord, HostingContractStatus } from '@/lib/ops/hosting-maintenance/types'

type Db = SupabaseClient<Database>
type Row = Database['public']['Tables']['ops_hosting_contracts']['Row']

export function mapHostingContractRow(
  row: Row & { clients?: { name: string; email: string | null } | null }
): HostingContractRecord {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    clientName: row.clients?.name ?? 'Unknown client',
    clientEmail: row.clients?.email ?? null,
    periodType: row.period_type as HostingMaintenancePeriod,
    customPeriod: row.custom_period,
    costAmount: Number(row.cost_amount),
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status as HostingContractStatus,
    renewalNotifiedAt: row.renewal_notified_at,
    adminRenewalNotifiedAt: row.admin_renewal_notified_at,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const SELECT = '*, clients ( name, email )'

export async function listHostingContracts(supabase: Db): Promise<HostingContractRecord[]> {
  const { data, error } = await supabase
    .from('ops_hosting_contracts')
    .select(SELECT)
    .order('period_end', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(row => mapHostingContractRow(row))
}

export async function getHostingContract(
  supabase: Db,
  id: string
): Promise<HostingContractRecord | null> {
  const { data, error } = await supabase
    .from('ops_hosting_contracts')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapHostingContractRow(data) : null
}

export function parseHostingContractInput(raw: unknown) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid contract data')
  const body = raw as Record<string, unknown>

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) throw new Error('Name is required')

  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
  if (!clientId) throw new Error('Client is required')

  const costAmount = Number(body.costAmount)
  if (!Number.isFinite(costAmount) || costAmount < 0) {
    throw new Error('Cost must be a non-negative number')
  }

  const periodTypeRaw = body.periodType
  const periodType: HostingMaintenancePeriod = isHostingMaintenancePeriod(periodTypeRaw)
    ? periodTypeRaw
    : 'year'

  const periodStart = typeof body.periodStart === 'string' ? body.periodStart.trim() : ''
  const periodEnd = typeof body.periodEnd === 'string' ? body.periodEnd.trim() : ''
  if (!periodStart || !periodEnd) throw new Error('Period start and end dates are required')
  if (periodEnd < periodStart) throw new Error('Period end must be on or after period start')

  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

  return {
    name,
    clientId,
    costAmount: Math.round(costAmount * 100) / 100,
    periodType,
    customPeriod: null,
    periodStart,
    periodEnd,
    notes: notes || null,
  }
}
