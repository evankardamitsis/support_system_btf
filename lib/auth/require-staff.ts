import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isBtfStaffRole } from '@/lib/auth/staff'

export async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: accessProfile }] = await Promise.all([
    supabase.from('users').select('id, role, full_name').eq('id', user.id).single(),
    supabase.from('users').select('portal_access_scope').eq('id', user.id).maybeSingle(),
  ])

  if (profile?.role === 'client') {
    redirect(accessProfile?.portal_access_scope === 'performance' ? '/portal/performance' : '/portal/tickets')
  }

  if (!isBtfStaffRole(profile?.role)) {
    redirect(`/auth/login?error=${encodeURIComponent('BTF team access only.')}`)
  }

  return {
    supabase,
    user,
    profile: profile!,
    role: profile!.role as 'admin' | 'agent',
  }
}
