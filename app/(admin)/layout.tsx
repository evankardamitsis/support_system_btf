import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/admin/DashboardShell'
import { isBtfStaffRole } from '@/lib/auth/staff'
import { isMacosDesktopReleasePublished } from '@/lib/desktop/release-server'
import '../styles/admin-theme.css'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: accessProfile }] = await Promise.all([
    supabase.from('users').select('role, full_name').eq('id', user.id).single(),
    supabase.from('users').select('portal_access_scope').eq('id', user.id).maybeSingle(),
  ])

  if (profile?.role === 'client') {
    redirect(accessProfile?.portal_access_scope === 'performance' ? '/portal/performance' : '/portal/tickets')
  }
  if (!isBtfStaffRole(profile?.role)) {
    redirect(`/auth/login?error=${encodeURIComponent('BTF team access only.')}`)
  }

  const desktopDownloadAvailable = await isMacosDesktopReleasePublished()

  return (
    <DashboardShell
      userName={profile?.full_name ?? undefined}
      userEmail={user.email}
      userRole={profile?.role ?? undefined}
      desktopDownloadAvailable={desktopDownloadAvailable}
    >
      {children}
    </DashboardShell>
  )
}
