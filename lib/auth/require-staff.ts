import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isBtfStaffRole } from '@/lib/auth/staff'

export async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'client') redirect('/portal/tickets')

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
