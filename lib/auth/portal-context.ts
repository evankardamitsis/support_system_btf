import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureClientProfile } from '@/lib/auth/ensure-client-profile'

export async function requirePortalClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let { data: profile } = await supabase
    .from('users')
    .select('role, client_id, full_name, portal_onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'admin' || profile?.role === 'agent') {
    redirect('/admin/tickets')
  }

  if (profile?.role !== 'client' || !profile.client_id) {
    const ensured = user.email ? await ensureClientProfile(user.id, user.email) : null
    if (!ensured) {
      redirect(
        `/auth/login?error=${encodeURIComponent('No portal access for this account.')}`
      )
    }
    return {
      supabase,
      user,
      clientId: ensured.client_id,
      fullName: ensured.full_name,
      onboardingCompleted: false,
    }
  }

  return {
    supabase,
    user,
    clientId: profile.client_id,
    fullName: profile.full_name,
    onboardingCompleted: !!profile.portal_onboarding_completed_at,
  }
}
