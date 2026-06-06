import type { SupabaseClient } from '@supabase/supabase-js'
import { ilikePattern, mergeById, searchClients, type ClientSearchHit } from '@/lib/search/dashboard'

export type { ClientSearchHit }

function relatedName(relation: { name: string } | { name: string }[] | null | undefined) {
  if (!relation) return null
  return Array.isArray(relation) ? (relation[0]?.name ?? null) : relation.name
}

export type ProjectSearchHit = {
  id: string
  name: string
  clientName: string | null
}

export type OfferSearchHit = {
  id: string
  clientName: string
  status: string
}

export type HostingSearchHit = {
  id: string
  name: string
  clientName: string
}

export type TaskSearchHit = {
  id: string
  title: string
  projectId: string
  projectName: string
}

export async function searchOpsProjects(
  supabase: SupabaseClient,
  term: string,
  limit = 6
): Promise<ProjectSearchHit[]> {
  const pattern = ilikePattern(term)
  const select = 'id, name, clients(name)' as const

  const [byName, byDescription] = await Promise.all([
    supabase
      .from('ops_projects')
      .select(select)
      .is('deleted_at', null)
      .ilike('name', pattern)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('ops_projects')
      .select(select)
      .is('deleted_at', null)
      .ilike('description', pattern)
      .order('updated_at', { ascending: false })
      .limit(limit),
  ])

  if (byName.error) throw byName.error
  if (byDescription.error) throw byDescription.error

  const mapRow = (row: {
    id: string
    name: string
    clients: { name: string } | { name: string }[] | null
  }): ProjectSearchHit => ({
    id: row.id,
    name: row.name,
    clientName: relatedName(row.clients),
  })

  return mergeById(
    [...(byName.data ?? []), ...(byDescription.data ?? [])].map(mapRow),
    limit
  )
}

export async function searchFinancialOffers(
  supabase: SupabaseClient,
  term: string,
  limit = 6
): Promise<OfferSearchHit[]> {
  const pattern = ilikePattern(term)

  const { data, error } = await supabase
    .from('financial_offers')
    .select('id, client_name, status')
    .is('deleted_at', null)
    .ilike('client_name', pattern)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map(row => ({
    id: row.id,
    clientName: row.client_name,
    status: row.status,
  }))
}

export async function searchHostingContracts(
  supabase: SupabaseClient,
  term: string,
  limit = 6
): Promise<HostingSearchHit[]> {
  const pattern = ilikePattern(term)
  const select = 'id, name, clients(name)' as const

  const { data, error } = await supabase
    .from('ops_hosting_contracts')
    .select(select)
    .ilike('name', pattern)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    clientName: relatedName(row.clients) ?? 'Client',
  }))
}

export async function searchOpsTasks(
  supabase: SupabaseClient,
  term: string,
  limit = 6
): Promise<TaskSearchHit[]> {
  const pattern = ilikePattern(term)
  const select = 'id, title, project_id, ops_projects(name)' as const

  const { data, error } = await supabase
    .from('ops_project_tasks')
    .select(select)
    .is('deleted_at', null)
    .ilike('title', pattern)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map(row => ({
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    projectName: relatedName(row.ops_projects) ?? 'Project',
  }))
}

export { searchClients }
