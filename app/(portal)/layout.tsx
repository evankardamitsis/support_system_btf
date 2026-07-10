import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureClientProfile } from '@/lib/auth/ensure-client-profile'
import { PortalDashboardShell } from '@/components/portal/DashboardShell'
import { clientUsesHourBilling } from '@/lib/retainers/billing-model'
import '../styles/dashboard-theme.css'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let { data: profile } = await supabase
    .from('users')
    .select('role, full_name, client_id, portal_onboarding_completed_at')
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
    const { data: ensuredProfile } = await supabase
      .from('users')
      .select('role, full_name, client_id, portal_onboarding_completed_at')
      .eq('id', user.id)
      .single()
    profile = ensuredProfile ?? {
      role: 'client',
      full_name: ensured.full_name,
      client_id: ensured.client_id,
      portal_onboarding_completed_at: null,
    }
  }

  const hoursBilling = profile?.client_id
    ? await clientUsesHourBilling(supabase, profile.client_id)
    : true

  return (
    <PortalDashboardShell
      userName={profile?.full_name ?? undefined}
      userEmail={user.email}
      onboardingCompleted={!!profile?.portal_onboarding_completed_at}
      hoursBilling={hoursBilling}
    >
      {children}
    </PortalDashboardShell>
  )
}
