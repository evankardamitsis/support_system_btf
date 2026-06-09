import { createAdminClient } from '@/lib/supabase/admin'
import {
  listStaffUserIds,
  notifyClientRegistered,
} from '@/lib/ops/notifications/service'

type NotifyAdminsClientRegisteredInput = {
  userId: string
  clientId: string
  registrantName: string
  clientName: string
  kind: 'primary' | 'team'
}

export async function notifyAdminsClientRegistered(
  input: NotifyAdminsClientRegisteredInput
): Promise<void> {
  const admin = createAdminClient()
  const adminIds = await listStaffUserIds(admin, { adminsOnly: true })
  await notifyClientRegistered(admin, input, adminIds)
}
