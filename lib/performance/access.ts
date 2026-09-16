import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthEmailById } from '@/lib/team/auth-users'
import type { PerformanceAccessDirectory } from './access-types'

export async function getPerformanceAccessDirectory(
  accountId: string,
  clientId: string
): Promise<PerformanceAccessDirectory> {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const [profileResult, inviteResult] = await Promise.all([
    admin
      .from('users')
      .select('id, full_name, created_at')
      .eq('client_id', clientId)
      .eq('role', 'client')
      .eq('portal_access_scope', 'performance')
      .order('created_at'),
    admin
      .from('client_invite_tokens')
      .select('id, full_name, email, expires_at')
      .eq('performance_account_id', accountId)
      .eq('access_scope', 'performance')
      .eq('used', false)
      .gt('expires_at', now)
      .order('created_at'),
  ])
  const setupRequired = [profileResult.error, inviteResult.error].some(error =>
    error?.code === '42703' || /portal_access_scope|access_scope|performance_account_id/i.test(error?.message || '')
  )
  if ((profileResult.error || inviteResult.error) && !setupRequired) {
    throw new Error(profileResult.error?.message || inviteResult.error?.message)
  }

  const profiles = profileResult.data
  const invites = inviteResult.data

  const viewers = await Promise.all(
    (profiles || []).map(async profile => ({
      id: profile.id,
      fullName: profile.full_name,
      email: (await getAuthEmailById(admin, profile.id)) || '',
      createdAt: profile.created_at || '',
    }))
  )

  return {
    setupRequired,
    viewers,
    pendingInvites: (invites || []).map(invite => ({
      id: invite.id,
      fullName: invite.full_name,
      email: invite.email,
      expiresAt: invite.expires_at,
    })),
  }
}
