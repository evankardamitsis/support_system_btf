import type { StaffRole } from '@/lib/team/roles'

export type InviteTeamMemberResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

export type RevokeStaffInviteResult =
  | { ok: true }
  | { ok: false; error: string }

export type TeamDirectoryResult = {
  members: Array<{
    id: string
    email: string
    full_name: string | null
    role: StaffRole
    created_at: string
  }>
  pendingInvites: Array<{
    id: string
    email: string
    full_name: string
    role: StaffRole
    expires_at: string
    created_at: string
    invite_url: string
  }>
  error: string | null
}
