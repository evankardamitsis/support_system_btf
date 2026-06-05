import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { ensureClientProfile } from '@/lib/auth/ensure-client-profile'

async function resolveRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string | undefined
): Promise<'client' | 'admin' | 'agent' | null> {
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'client' || profile?.role === 'admin' || profile?.role === 'agent') {
    return profile.role
  }

  if (!email) return null

  const ensured = await ensureClientProfile(userId, email)
  return ensured ? 'client' : null
}

export async function getPostLoginPath(
  supabase: SupabaseClient<Database>
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return '/auth/login'

  const role = await resolveRole(supabase, user.id, user.email)

  if (role === 'client') return '/portal/tickets'
  if (role === 'admin' || role === 'agent') return '/admin/tickets'

  return `/auth/login?error=${encodeURIComponent(
    'Account not set up yet. Contact your BTF account manager.'
  )}`
}
