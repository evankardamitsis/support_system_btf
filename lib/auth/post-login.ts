import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { ensureClientProfile } from '@/lib/auth/ensure-client-profile'
import { notifyAdminsPerformanceViewerJoinedOnce } from '@/lib/email/performance-viewer-joined'
import { tryCreateAdminClient } from '@/lib/supabase/admin'

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
    if (profile.accessScope !== 'performance') return '/portal/tickets'

    // Covers viewers granted access on an existing account (no invite signup step).
    const adminResult = tryCreateAdminClient()
    if (!('error' in adminResult)) {
      const { data: viewer } = await adminResult.client
        .from('users')
        .select('client_id, full_name')
        .eq('id', user.id)
        .maybeSingle()
      if (viewer?.client_id) {
        await notifyAdminsPerformanceViewerJoinedOnce(adminResult.client, {
          userId: user.id,
          clientId: viewer.client_id,
          email: user.email ?? '',
          fullName: viewer.full_name?.trim() || user.email || 'Dashboard viewer',
        })
      }
    }
    return '/portal/performance'
  }
  if (profile?.role === 'admin' || profile?.role === 'agent') return '/admin/tickets'

  return `/auth/login?error=${encodeURIComponent(
    'Account not set up yet. Contact your BTF account manager.'
  )}`
}
