import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/admin/DashboardShell'
import { isBtfStaffRole } from '@/lib/auth/staff'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users').select('role, full_name').eq('id', user.id).single()

  if (profile?.role === 'client') redirect('/portal/tickets')
  if (!isBtfStaffRole(profile?.role)) {
    redirect(`/auth/login?error=${encodeURIComponent('BTF team access only.')}`)
  }

  return (
    <DashboardShell
      userName={profile?.full_name ?? undefined}
      userEmail={user.email}
      userRole={profile?.role ?? undefined}
    >
      {children}
    </DashboardShell>
  )
}
