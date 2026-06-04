import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalDashboardShell } from '@/components/portal/DashboardShell'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users').select('role, full_name').eq('id', user.id).single()

  if (profile?.role !== 'client') redirect('/admin/tickets')

  return (
    <PortalDashboardShell
      userName={profile?.full_name ?? undefined}
      userEmail={user.email}
    >
      {children}
    </PortalDashboardShell>
  )
}
