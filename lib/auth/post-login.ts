import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { ensureClientProfile } from '@/lib/auth/ensure-client-profile'

async function resolveRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string | undefined
): Promise<{ role: 'client' | 'admin' | 'agent'; accessScope: 'full' | 'performance' } | null> {
  const [{ data: profile }, { data: accessProfile }] = await Promise.all([
    supabase.from('users').select('role').eq('id', userId).maybeSingle(),
    supabase.from('users').select('portal_access_scope').eq('id', userId).maybeSingle(),
  ])

  if (profile?.role === 'client' || profile?.role === 'admin' || profile?.role === 'agent') {
    return {
      role: profile.role,
      accessScope: profile.role === 'client' && accessProfile?.portal_access_scope === 'performance'
        ? 'performance'
        : 'full',
    }
  }

  if (!email) return null

  const ensured = await ensureClientProfile(userId, email)
  return ensured ? { role: 'client', accessScope: 'full' } : null
}

export async function getPostLoginPath(
  supabase: SupabaseClient<Database>
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return '/auth/login'

  const profile = await resolveRole(supabase, user.id, user.email)

  if (profile?.role === 'client') {
    return profile.accessScope === 'performance' ? '/portal/performance' : '/portal/tickets'
  }
  if (profile?.role === 'admin' || profile?.role === 'agent') return '/admin/tickets'

  return `/auth/login?error=${encodeURIComponent(
    'Account not set up yet. Contact your BTF account manager.'
  )}`
}
