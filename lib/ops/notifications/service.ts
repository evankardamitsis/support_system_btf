import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { OpsNotificationRecord, OpsNotificationType } from '@/lib/ops/notifications/types'

type Db = SupabaseClient<Database>
type NotificationRow = Database['public']['Tables']['ops_notifications']['Row']

function mapNotificationRow(row: NotificationRow): OpsNotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as OpsNotificationRecord['type'],
    title: row.title,
    body: row.body,
    href: row.href,
    dedupeKey: row.dedupe_key,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

export async function listStaffUserIds(
  supabase: Db,
  options: { adminsOnly?: boolean } = {}
): Promise<string[]> {
  const roles = options.adminsOnly ? (['admin'] as const) : (['admin', 'agent'] as const)
  const { data, error } = await supabase.from('users').select('id').in('role', [...roles])
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => row.id)
}

export async function insertOpsNotification(
  supabase: Db,
  input: {
    userId: string
    type: OpsNotificationType
    title: string
    body?: string | null
    href: string
    dedupeKey?: string | null
  }
): Promise<void> {
  const { error } = await supabase.from('ops_notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href,
    dedupe_key: input.dedupeKey ?? null,
  })

  if (error?.code === '23505') return
  if (error) throw new Error(error.message)
}

export async function insertOpsNotificationForUsers(
  supabase: Db,
  userIds: string[],
  input: Omit<Parameters<typeof insertOpsNotification>[1], 'userId'>
): Promise<number> {
  const unique = [...new Set(userIds.filter(Boolean))]
  let created = 0

  for (const userId of unique) {
    try {
      await insertOpsNotification(supabase, { ...input, userId })
      created += 1
    } catch {
      // Skip individual failures so one bad row does not block the batch.
    }
  }

  return created
}

export async function listOpsNotifications(
  supabase: Db,
  userId: string,
  limit = 20
): Promise<OpsNotificationRecord[]> {
  const { data, error } = await supabase
    .from('ops_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapNotificationRow)
}

export async function countUnreadOpsNotifications(supabase: Db, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('ops_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function markOpsNotificationRead(
  supabase: Db,
  userId: string,
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from('ops_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw new Error(error.message)
}

export async function markAllOpsNotificationsRead(supabase: Db, userId: string): Promise<void> {
  const { error } = await supabase
    .from('ops_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw new Error(error.message)
}

export async function notifyTaskAssigned(
  supabase: Db,
  input: {
    assigneeId: string
    taskId: string
    taskTitle: string
    projectId: string
    projectName: string
  }
) {
  await insertOpsNotification(supabase, {
    userId: input.assigneeId,
    type: 'task_assigned',
    title: `Assigned: ${input.taskTitle}`,
    body: input.projectName,
    href: `/admin/ops/projects/${input.projectId}?task=${input.taskId}`,
  })
}

export async function notifyOfferAccepted(
  supabase: Db,
  input: { offerId: string; clientName: string; acceptedByUserId: string },
  staffIds: string[]
) {
  const recipients = staffIds.filter(id => id !== input.acceptedByUserId)
  await insertOpsNotificationForUsers(supabase, recipients.length ? recipients : staffIds, {
    type: 'offer_accepted',
    title: `Offer accepted — ${input.clientName}`,
    body: 'Ready for project setup',
    href: `/admin/ops/financial-offers/${input.offerId}`,
    dedupeKey: `offer-accepted:${input.offerId}`,
  })
}

export async function notifyProjectCompleted(
  supabase: Db,
  input: { projectId: string; projectName: string; leadId: string | null }
) {
  if (!input.leadId) return

  await insertOpsNotification(supabase, {
    userId: input.leadId,
    type: 'project_completed',
    title: `Project completed — ${input.projectName}`,
    href: `/admin/ops/projects/${input.projectId}`,
    dedupeKey: `project-completed:${input.projectId}`,
  })
}
