import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { mapFinancialOfferRow } from '@/lib/ops/financial-offer/service'
import type { FinancialOfferRecord } from '@/lib/ops/financial-offer/types'
import { mapHostingContractRow } from '@/lib/ops/hosting-maintenance/service'
import type { HostingContractRecord } from '@/lib/ops/hosting-maintenance/types'
import { listOpsProjectsForClient } from '@/lib/ops/projects/service'
import type { OpsProjectRecord } from '@/lib/ops/projects/types'

type Db = SupabaseClient<Database>

export type ClientOpsSummary = {
  projects: OpsProjectRecord[]
  offers: FinancialOfferRecord[]
  hosting: HostingContractRecord[]
}

export async function getClientOpsSummary(
  supabase: Db,
  clientId: string,
  clientName: string
): Promise<ClientOpsSummary> {
  const [projects, { data: linkedOffers }, { data: legacyOffers }, { data: hosting }] =
    await Promise.all([
      listOpsProjectsForClient(supabase, clientId),
      supabase
        .from('financial_offers')
        .select('*')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('financial_offers')
        .select('*')
        .is('client_id', null)
        .is('deleted_at', null)
        .ilike('client_name', clientName.trim())
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('ops_hosting_contracts')
        .select('*, clients ( name, email )')
        .eq('client_id', clientId)
        .order('period_end', { ascending: true })
        .limit(20),
    ])

  const offersById = new Map<string, FinancialOfferRecord>()
  for (const row of [...(linkedOffers ?? []), ...(legacyOffers ?? [])]) {
    offersById.set(row.id, mapFinancialOfferRow(row))
  }

  return {
    projects,
    offers: [...offersById.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    hosting: (hosting ?? []).map(row => mapHostingContractRow(row)),
  }
}
