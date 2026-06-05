import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureClientProfile } from '@/lib/auth/ensure-client-profile'

export async function requireClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, client_id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'client' && profile.client_id) {
    return {
      supabase,
      user,
      profile,
      clientId: profile.client_id,
    }
  }

  const ensured = user.email ? await ensureClientProfile(user.id, user.email) : null
  if (!ensured) {
    throw new Error('Not authorized')
  }

  return {
    supabase,
    user,
    profile: {
      role: 'client' as const,
      client_id: ensured.client_id,
      full_name: ensured.full_name,
    },
    clientId: ensured.client_id,
  }
}
