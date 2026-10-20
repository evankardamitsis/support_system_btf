import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { emailShell } from '@/lib/email/email-shell'
import { sendEmail } from '@/lib/email/send'
import { insertOpsNotificationForUsers, listStaffUserIds } from '@/lib/ops/notifications/service'

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
}

async function getAuthEmails(admin: SupabaseClient<Database>, userIds: string[]): Promise<string[]> {
  const emails: string[] = []
  for (const id of userIds) {
    const { data } = await admin.auth.admin.getUserById(id)
    const email = data?.user?.email?.trim()
    if (email) emails.push(email)
  }
  return [...new Set(emails)]
}

const dedupeKey = (userId: string) => `performance-viewer-joined:${userId}`

/**
 * Tell admins (in-app + email) the first time a Performance HQ viewer signs in — whether they
 * accepted a new invite or were granted access on an existing account. Sent once per user;
 * the ops_notifications dedupe key is the record. Never throws.
 */
export async function notifyAdminsPerformanceViewerJoinedOnce(
  admin: SupabaseClient<Database>,
  input: { userId: string; clientId: string; email: string; fullName: string }
): Promise<void> {
  try {
    // Viewers who registered before this alert existed already got a "joined" notification.
    const { data: existing } = await admin
      .from('ops_notifications')
      .select('id')
      .in('dedupe_key', [dedupeKey(input.userId), `client-registered:${input.userId}`])
      .limit(1)
    if (existing?.length) return

    const adminIds = await listStaffUserIds(admin, { adminsOnly: true })
    if (!adminIds.length) return

    const { data: account } = await admin
      .from('performance_accounts')
      .select('display_name')
      .eq('client_id', input.clientId)
      .limit(1)
      .maybeSingle()
    const dashboardName = account?.display_name?.trim() || 'Performance HQ'
    const href = '/admin/performance/integrations'

    await insertOpsNotificationForUsers(admin, adminIds, {
      type: 'client_registered',
      title: `Dashboard viewer joined — ${dashboardName}`,
      body: input.fullName,
      href,
      dedupeKey: dedupeKey(input.userId),
    })

    const recipients = await getAuthEmails(admin, adminIds)
    if (!recipients.length) return

    const result = await sendEmail({
      to: recipients,
      subject: `Dashboard invite accepted — ${dashboardName}`,
      html: emailShell(
        'Dashboard invite accepted',
        `<strong>${input.fullName}</strong> (${input.email}) signed in to the read-only Performance HQ for <strong>${dashboardName}</strong> for the first time.`,
        'Manage dashboard access',
        `${appOrigin()}${href}`
      ),
    })
    if (!result.ok) console.error('[email] Performance viewer joined alert failed:', result.error)
  } catch (error) {
    console.error('[notifications] Performance viewer joined alert failed:', error)
  }
}
