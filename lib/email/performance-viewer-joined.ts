import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { emailShell } from '@/lib/email/email-shell'
import { sendEmail } from '@/lib/email/send'
import { listStaffUserIds } from '@/lib/ops/notifications/service'

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
}

async function getAdminEmails(admin: SupabaseClient<Database>): Promise<string[]> {
  const adminIds = await listStaffUserIds(admin, { adminsOnly: true })
  const emails: string[] = []
  for (const id of adminIds) {
    const { data } = await admin.auth.admin.getUserById(id)
    const email = data?.user?.email?.trim()
    if (email) emails.push(email)
  }
  return [...new Set(emails)]
}

/** Email admins when someone accepts a Performance HQ dashboard invite. Never throws. */
export async function notifyAdminsPerformanceViewerJoined(
  admin: SupabaseClient<Database>,
  input: { email: string; fullName: string; performanceAccountId: string | null }
): Promise<void> {
  try {
    const recipients = await getAdminEmails(admin)
    if (!recipients.length) return

    const { data: account } = input.performanceAccountId
      ? await admin
          .from('performance_accounts')
          .select('display_name')
          .eq('id', input.performanceAccountId)
          .maybeSingle()
      : { data: null }
    const dashboardName = account?.display_name?.trim() || 'Performance HQ'

    const result = await sendEmail({
      to: recipients,
      subject: `Dashboard invite accepted — ${dashboardName}`,
      html: emailShell(
        'Dashboard invite accepted',
        `<strong>${input.fullName}</strong> (${input.email}) accepted their invite and signed in to the read-only Performance HQ for <strong>${dashboardName}</strong>.`,
        'Manage dashboard access',
        `${appOrigin()}/admin/performance/integrations`
      ),
    })
    if (!result.ok) console.error('[email] Performance viewer joined alert failed:', result.error)
  } catch (error) {
    console.error('[email] Performance viewer joined alert failed:', error)
  }
}
