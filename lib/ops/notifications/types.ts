export const OPS_NOTIFICATION_TYPES = [
  'task_assigned',
  'task_due',
  'task_overdue',
  'offer_accepted',
  'hosting_renewal',
  'project_completed',
  'mention',
  'client_registered',
] as const

export type OpsNotificationType = (typeof OPS_NOTIFICATION_TYPES)[number]

export type OpsNotificationRecord = {
  id: string
  userId: string
  type: OpsNotificationType
  title: string
  body: string | null
  href: string
  dedupeKey: string | null
  readAt: string | null
  createdAt: string
}
