import type { ClientTeamDirectoryResult } from '@/lib/client-team/action-results'

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
