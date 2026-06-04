import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null, isAdmin: false as const }

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  return {
    supabase,
    user,
    profile,
    isAdmin: profile?.role === 'admin',
  }
}
