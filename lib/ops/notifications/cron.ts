import { daysUntilExpiry } from '@/lib/ops/hosting-maintenance/display'
import { HOSTING_RENEWAL_REMINDER_DAYS } from '@/lib/ops/hosting-maintenance/types'
import {
  insertOpsNotificationForUsers,
  listStaffUserIds,
} from '@/lib/ops/notifications/service'
import { tryCreateAdminClient } from '@/lib/supabase/admin'

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function processOpsNotificationCron(): Promise<{
  taskDue: number
  taskOverdue: number
  hostingRenewal: number
  errors: string[]
}> {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return { taskDue: 0, taskOverdue: 0, hostingRenewal: 0, errors: [adminResult.error] }
  }

  const supabase = adminResult.client
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = addDays(today, 1)
  const errors: string[] = []

  const [adminIds, staffIds] = await Promise.all([
    listStaffUserIds(supabase, { adminsOnly: true }),
    listStaffUserIds(supabase),
  ])

  let taskDue = 0
  let taskOverdue = 0
  let hostingRenewal = 0

  const { data: activeProjects, error: projectsError } = await supabase
    .from('ops_projects')
    .select('id, name')
    .in('status', ['active', 'on_hold'])
    .is('deleted_at', null)

  if (projectsError) {
    errors.push(projectsError.message)
  } else if ((activeProjects ?? []).length > 0) {
    const projectIds = activeProjects!.map(row => row.id)
    const projectNames = new Map(activeProjects!.map(row => [row.id, row.name]))

    const [{ data: dueTomorrow }, { data: overdue }] = await Promise.all([
      supabase
        .from('ops_project_tasks')
        .select('id, title, due_date, project_id, assignee_id')
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .neq('status', 'done')
        .eq('due_date', tomorrow),
      supabase
        .from('ops_project_tasks')
        .select('id, title, due_date, project_id, assignee_id')
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .neq('status', 'done')
        .not('due_date', 'is', null)
        .lt('due_date', today),
    ])

    for (const task of dueTomorrow ?? []) {
      const projectName = projectNames.get(task.project_id) ?? 'Project'
      const recipients = task.assignee_id ? [task.assignee_id] : adminIds
      try {
        taskDue += await insertOpsNotificationForUsers(supabase, recipients, {
          type: 'task_due',
          title: `Due tomorrow — ${task.title}`,
          body: projectName,
          href: `/admin/ops/projects/${task.project_id}?task=${task.id}`,
          dedupeKey: `task-due:${task.id}:${task.due_date}`,
        })
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Task due notification failed')
      }
    }

    for (const task of overdue ?? []) {
      const projectName = projectNames.get(task.project_id) ?? 'Project'
      const recipients = task.assignee_id ? [task.assignee_id] : adminIds
      try {
        taskOverdue += await insertOpsNotificationForUsers(supabase, recipients, {
          type: 'task_overdue',
          title: `Overdue — ${task.title}`,
          body: `${projectName} · due ${task.due_date}`,
          href: `/admin/ops/projects/${task.project_id}?task=${task.id}`,
          dedupeKey: `task-overdue:${task.id}:${task.due_date}`,
        })
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Task overdue notification failed')
      }
    }
  }

  const { data: hostingContracts, error: hostingError } = await supabase
    .from('ops_hosting_contracts')
    .select('id, name, period_end, clients(name)')
    .eq('status', 'active')

  if (hostingError) {
    errors.push(hostingError.message)
  } else {
    for (const contract of hostingContracts ?? []) {
      const days = daysUntilExpiry(contract.period_end)
      if (days < 0 || days > HOSTING_RENEWAL_REMINDER_DAYS) continue

      const clientName = Array.isArray(contract.clients)
        ? (contract.clients[0]?.name ?? 'Client')
        : (contract.clients?.name ?? 'Client')

      try {
        hostingRenewal += await insertOpsNotificationForUsers(supabase, staffIds, {
          type: 'hosting_renewal',
          title: `Hosting renews in ${days}d — ${contract.name}`,
          body: clientName,
          href: `/admin/ops/hosting-maintenance/${contract.id}`,
          dedupeKey: `hosting-renewal:${contract.id}:${contract.period_end}`,
        })
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Hosting notification failed')
      }
    }
  }

  return { taskDue, taskOverdue, hostingRenewal, errors }
}
