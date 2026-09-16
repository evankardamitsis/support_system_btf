import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function requirePerformanceViewer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, client_id, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin' || profile?.role === 'agent') {
    redirect('/admin/performance')
  }
  if (profile?.role !== 'client' || !profile.client_id) {
    redirect(`/auth/login?error=${encodeURIComponent('No performance dashboard access for this account.')}`)
  }

  const admin = createAdminClient()
  const { data: account, error } = await admin
    .from('performance_accounts')
    .select('id')
    .eq('client_id', profile.client_id)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !account) {
    redirect(`/auth/login?error=${encodeURIComponent('No active performance dashboard is assigned to this account.')}`)
  }

  return { admin, user, profile, accountId: account.id }
}
