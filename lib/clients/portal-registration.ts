import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClientTeamDirectoryResult } from '@/lib/client-team/action-results'
import type { Database } from '@/lib/database.types'
import { getAuthEmailById } from '@/lib/team/auth-users'

export type ClientPortalRegistrationStatus =
  | { state: 'registered'; registeredAt: string; name: string | null }
  | { state: 'pending' }
  | { state: 'not_registered' }

export function getClientPortalRegistrationStatus(
  directory: ClientTeamDirectoryResult,
  options?: { hasLegacyInvitePending?: boolean }
): ClientPortalRegistrationStatus {
  const primary = directory.members.find(member => member.is_primary_contact)
  if (primary) {
    return {
      state: 'registered',
      registeredAt: primary.created_at,
      name: primary.full_name,
    }
  }

  const primaryEmail = directory.primaryContactEmail.trim().toLowerCase()
  const teamInvitePending = directory.pendingInvites.some(
    invite => invite.email.trim().toLowerCase() === primaryEmail
  )

  if (teamInvitePending || options?.hasLegacyInvitePending) {
    return { state: 'pending' }
  }

  return { state: 'not_registered' }
}

export async function loadClientPortalRegistrationStatus(
  admin: SupabaseClient<Database>,
  clientId: string
): Promise<ClientPortalRegistrationStatus> {
  const [
    { data: clientRow },
    { data: profiles },
    { data: invites },
    { data: legacyInvite },
  ] = await Promise.all([
    admin.from('clients').select('email').eq('id', clientId).maybeSingle(),
    admin
      .from('users')
      .select('id, full_name, created_at')
      .eq('client_id', clientId)
      .eq('role', 'client')
      .order('created_at', { ascending: true }),
    admin
      .from('client_invite_tokens')
      .select('email')
      .eq('client_id', clientId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString()),
    admin
      .from('invite_tokens')
      .select('id')
      .eq('client_id', clientId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle(),
  ])

  const primaryContactEmail = clientRow?.email?.trim() ?? ''
  const primaryNormalized = primaryContactEmail.toLowerCase()

  const members = await Promise.all(
    (profiles ?? []).map(async profile => {
      const email = (await getAuthEmailById(admin, profile.id)) ?? ''
      return {
        id: profile.id,
        email,
        full_name: profile.full_name,
        is_primary_contact: email.trim().toLowerCase() === primaryNormalized,
        created_at: profile.created_at ?? '',
      }
    })
  )

  const directory: ClientTeamDirectoryResult = {
    clientName: '',
    primaryContactEmail,
    members,
    pendingInvites: (invites ?? []).map(invite => ({
      id: '',
      email: invite.email,
      full_name: '',
      expires_at: '',
      created_at: '',
      invite_url: '',
    })),
    error: null,
  }

  return getClientPortalRegistrationStatus(directory, {
    hasLegacyInvitePending: Boolean(legacyInvite),
  })
}
