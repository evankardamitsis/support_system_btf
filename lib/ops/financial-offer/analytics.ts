import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { FinancialOfferRecord } from './types'
import { mapFinancialOfferRow } from './service'

type Db = SupabaseClient<Database>

/** Accepted, non-deleted offers — use for Ops analytics. */
export async function listActiveFinancialOffers(supabase: Db): Promise<FinancialOfferRecord[]> {
  const { data, error } = await supabase
    .from('financial_offers')
    .select('*')
    .eq('status', 'accepted')
    .is('deleted_at', null)
    .order('accepted_at', { ascending: false })

  if (error || !data) return []
  return data.map(mapFinancialOfferRow)
}

export type ActiveOffersSummary = {
  count: number
  totalValue: number
  totalUpfront: number
}

export async function getActiveOffersSummary(supabase: Db): Promise<ActiveOffersSummary> {
  const offers = await listActiveFinancialOffers(supabase)
  return {
    count: offers.length,
    totalValue: offers.reduce((sum, row) => sum + row.totalAmount, 0),
    totalUpfront: offers.reduce((sum, row) => sum + row.upfrontAmount, 0),
  }
}
