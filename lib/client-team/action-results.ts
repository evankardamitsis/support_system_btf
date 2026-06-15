export type InviteClientTeamMemberResult =
  | { ok: true; url: string; emailSent: boolean; emailError?: string | null }
  | { ok: false; error: string }

export type RevokeClientInviteResult = { ok: true } | { ok: false; error: string }

export type RemoveClientTeamMemberResult = { ok: true } | { ok: false; error: string }

export type ClientTeamMember = {
  id: string
  email: string
  full_name: string | null
  is_primary_contact: boolean
  created_at: string
}

export type ClientPendingInvite = {
  id: string
  email: string
  full_name: string
  expires_at: string
  created_at: string
  invite_url: string
}

export type ClientTeamDirectoryResult = {
  clientName: string
  primaryContactEmail: string
  members: ClientTeamMember[]
  pendingInvites: ClientPendingInvite[]
  error: string | null
}
