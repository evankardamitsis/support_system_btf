import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  getActiveOffersSummary,
  listActiveFinancialOffers,
} from '@/lib/ops/financial-offer/analytics'
import { getOfferProjectTotal } from '@/lib/ops/financial-offer/calculate'
import { daysUntilExpiry, isExpiringSoon } from '@/lib/ops/hosting-maintenance/display'
import { listHostingContracts } from '@/lib/ops/hosting-maintenance/service'
import type { HostingContractRecord } from '@/lib/ops/hosting-maintenance/types'
import { listOpsProjects } from '@/lib/ops/projects/service'
import type { OpsProjectRecord } from '@/lib/ops/projects/types'

type Db = SupabaseClient<Database>

export type OpsAttentionItem = {
  id: string
  kind: 'hosting' | 'task' | 'project' | 'offer'
  title: string
  meta: string
  href: string
  tone: 'danger' | 'warn' | 'info'
  sort: number
}

export type OpsDashboardRecentOffer = {
  id: string
  clientName: string
  totalAmount: number
  acceptedAt: string | null
}

export type OpsDashboardData = {
  openOffersCount: number
  openOffersValue: number
  acceptedSummary: { count: number; totalValue: number; totalUpfront: number }
  activeProjects: OpsProjectRecord[]
  overdueTasksCount: number
  unassignedTasksCount: number
  hostingExpiring14Count: number
  hostingExpiring30Count: number
  recentAcceptedOffers: OpsDashboardRecentOffer[]
  attentionItems: OpsAttentionItem[]
}

function openOffersValueFromRows(
  rows: Array<{ line_items: unknown; total_amount: number; hosting_maintenance: string | null }>
) {
  return rows.reduce((sum, row) => {
    const lineItems = (row.line_items as Array<{ work: string; cost: number }> | null) ?? []
    return (
      sum +
      getOfferProjectTotal({
        lineItems,
        totalAmount: Number(row.total_amount),
        hostingMaintenance: row.hosting_maintenance,
      })
    )
  }, 0)
}

function hostingExpiringWithinDays(contract: HostingContractRecord, days: number) {
  if (contract.status !== 'active') return false
  const until = daysUntilExpiry(contract.periodEnd)
  return until >= 0 && until <= days
}

export async function getOpsDashboard(
  supabase: Db,
  options: { includeProjects: boolean }
): Promise<OpsDashboardData> {
  const today = new Date().toISOString().slice(0, 10)

  const [
    { data: openOfferRows },
    acceptedSummary,
    recentAccepted,
    hostingContracts,
    projects,
  ] = await Promise.all([
    supabase
      .from('financial_offers')
      .select('line_items, total_amount, hosting_maintenance')
      .eq('status', 'open')
      .is('deleted_at', null),
    getActiveOffersSummary(supabase),
    listActiveFinancialOffers(supabase).then(rows => rows.slice(0, 5)),
    listHostingContracts(supabase),
    options.includeProjects ? listOpsProjects(supabase) : Promise.resolve([] as OpsProjectRecord[]),
  ])

  const openOffersCount = openOfferRows?.length ?? 0
  const openOffersValue = openOffersValueFromRows(openOfferRows ?? [])

  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'on_hold')
  const activeProjectIds = activeProjects.map(p => p.id)

  let overdueTasksCount = 0
  let unassignedTasksCount = 0
  const attentionItems: OpsAttentionItem[] = []

  const dueSoonEnd = new Date(`${today}T12:00:00`)
  dueSoonEnd.setDate(dueSoonEnd.getDate() + 3)
  const dueSoonEndStr = dueSoonEnd.toISOString().slice(0, 10)

  if (activeProjectIds.length > 0) {
    const [{ data: overdueTasks }, { data: unassignedTasks }, { data: dueSoonTasks }] =
      await Promise.all([
      supabase
        .from('ops_project_tasks')
        .select('id, title, due_date, project_id, priority')
        .in('project_id', activeProjectIds)
        .is('deleted_at', null)
        .neq('status', 'done')
        .not('due_date', 'is', null)
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .limit(12),
      supabase
        .from('ops_project_tasks')
        .select('id, title, project_id, priority')
        .in('project_id', activeProjectIds)
        .is('deleted_at', null)
        .is('assignee_id', null)
        .neq('status', 'done')
        .is('parent_id', null)
        .order('updated_at', { ascending: false })
        .limit(12),
      supabase
        .from('ops_project_tasks')
        .select('id, title, due_date, project_id, priority')
        .in('project_id', activeProjectIds)
        .is('deleted_at', null)
        .neq('status', 'done')
        .not('due_date', 'is', null)
        .gte('due_date', today)
        .lte('due_date', dueSoonEndStr)
        .order('due_date', { ascending: true })
        .limit(8),
    ])

    overdueTasksCount = overdueTasks?.length ?? 0
    unassignedTasksCount = unassignedTasks?.length ?? 0

    const projectNames = new Map(activeProjects.map(p => [p.id, p.name]))

    for (const task of overdueTasks ?? []) {
      attentionItems.push({
        id: `task-overdue-${task.id}`,
        kind: 'task',
        title: task.title,
        meta: `${projectNames.get(task.project_id) ?? 'Project'} · due ${task.due_date}`,
        href: `/admin/ops/projects/${task.project_id}?task=${task.id}`,
        tone: task.priority === 'high' ? 'danger' : 'warn',
        sort: task.priority === 'high' ? 10 : 20,
      })
    }

    for (const task of unassignedTasks ?? []) {
      if (attentionItems.some(item => item.id === `task-unassigned-${task.id}`)) continue
      attentionItems.push({
        id: `task-unassigned-${task.id}`,
        kind: 'task',
        title: task.title,
        meta: `${projectNames.get(task.project_id) ?? 'Project'} · unassigned`,
        href: `/admin/ops/projects/${task.project_id}?task=${task.id}`,
        tone: 'info',
        sort: 30,
      })
    }

    for (const task of dueSoonTasks ?? []) {
      if (
        attentionItems.some(
          item => item.id === `task-overdue-${task.id}` || item.id === `task-due-${task.id}`
        )
      ) {
        continue
      }
      attentionItems.push({
        id: `task-due-${task.id}`,
        kind: 'task',
        title: task.title,
        meta: `${projectNames.get(task.project_id) ?? 'Project'} · due ${task.due_date}`,
        href: `/admin/ops/projects/${task.project_id}?task=${task.id}`,
        tone: task.priority === 'high' ? 'warn' : 'info',
        sort: 22,
      })
    }

    for (const project of activeProjects) {
      if (!project.targetDate || project.targetDate >= today) continue
      const pct =
        project.taskCount > 0
          ? Math.round((project.doneTaskCount / project.taskCount) * 100)
          : 0
      if (pct >= 100) continue
      attentionItems.push({
        id: `project-late-${project.id}`,
        kind: 'project',
        title: project.name,
        meta: `Past target ${project.targetDate} · ${pct}% done`,
        href: `/admin/ops/projects/${project.id}`,
        tone: 'warn',
        sort: 25,
      })
    }
  }

  const hostingExpiring14 = hostingContracts.filter(c => isExpiringSoon(c.periodEnd, c.status))
  const hostingExpiring30 = hostingContracts.filter(c => hostingExpiringWithinDays(c, 30))

  for (const contract of hostingExpiring14) {
    const days = daysUntilExpiry(contract.periodEnd)
    attentionItems.push({
      id: `hosting-${contract.id}`,
      kind: 'hosting',
      title: contract.name,
      meta: `${contract.clientName} · renews in ${days} day${days === 1 ? '' : 's'}`,
      href: `/admin/ops/hosting-maintenance/${contract.id}`,
      tone: days <= 7 ? 'danger' : 'warn',
      sort: days <= 7 ? 5 : 15,
    })
  }

  for (const contract of hostingContracts) {
    if (contract.status !== 'active') continue
    const days = daysUntilExpiry(contract.periodEnd)
    if (days <= 14 || days > 30) continue
    if (attentionItems.some(item => item.id === `hosting-${contract.id}`)) continue
    attentionItems.push({
      id: `hosting-30-${contract.id}`,
      kind: 'hosting',
      title: contract.name,
      meta: `${contract.clientName} · renews in ${days} days`,
      href: `/admin/ops/hosting-maintenance/${contract.id}`,
      tone: 'info',
      sort: 18,
    })
  }

  for (const contract of hostingContracts) {
    if (contract.status !== 'expired') continue
    attentionItems.push({
      id: `hosting-expired-${contract.id}`,
      kind: 'hosting',
      title: contract.name,
      meta: `${contract.clientName} · expired ${contract.periodEnd}`,
      href: `/admin/ops/hosting-maintenance/${contract.id}`,
      tone: 'danger',
      sort: 12,
    })
  }

  const { data: staleOpenOffers } = await supabase
    .from('financial_offers')
    .select('id, client_name, created_at, emailed_at')
    .eq('status', 'open')
    .is('deleted_at', null)
    .is('emailed_at', null)
    .order('created_at', { ascending: true })
    .limit(5)

  for (const offer of staleOpenOffers ?? []) {
    attentionItems.push({
      id: `offer-${offer.id}`,
      kind: 'offer',
      title: offer.client_name,
      meta: 'Open offer · not emailed yet',
      href: `/admin/ops/financial-offers/${offer.id}`,
      tone: 'info',
      sort: 35,
    })
  }

  if (options.includeProjects) {
    const { data: acceptedWithoutProject } = await supabase
      .from('financial_offers')
      .select('id, client_name, accepted_at')
      .eq('status', 'accepted')
      .is('deleted_at', null)
      .order('accepted_at', { ascending: false })
      .limit(10)

    const offerIds = (acceptedWithoutProject ?? []).map(row => row.id)
    const linkedOfferIds = new Set<string>()

    if (offerIds.length > 0) {
      const { data: linkedProjects } = await supabase
        .from('ops_projects')
        .select('financial_offer_id')
        .in('financial_offer_id', offerIds)
        .is('deleted_at', null)

      for (const row of linkedProjects ?? []) {
        if (row.financial_offer_id) linkedOfferIds.add(row.financial_offer_id)
      }
    }

    for (const offer of acceptedWithoutProject ?? []) {
      if (linkedOfferIds.has(offer.id)) continue
      attentionItems.push({
        id: `offer-no-project-${offer.id}`,
        kind: 'offer',
        title: offer.client_name,
        meta: 'Accepted offer · no project yet',
        href: `/admin/ops/financial-offers/${offer.id}`,
        tone: 'warn',
        sort: 32,
      })
    }
  }

  attentionItems.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title))

  return {
    openOffersCount,
    openOffersValue,
    acceptedSummary,
    activeProjects: activeProjects.slice(0, 6),
    overdueTasksCount,
    unassignedTasksCount,
    hostingExpiring14Count: hostingExpiring14.length,
    hostingExpiring30Count: hostingExpiring30.length,
    recentAcceptedOffers: recentAccepted.map(row => ({
      id: row.id,
      clientName: row.clientName,
      totalAmount: getOfferProjectTotal(row),
      acceptedAt: row.acceptedAt,
    })),
    attentionItems: attentionItems.slice(0, 16),
  }
}
