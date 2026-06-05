'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { parseStaffRole, type StaffRole } from '@/lib/team/roles'
import { authUserExists, getAuthEmailById } from '@/lib/team/auth-users'

function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function staffInviteUrl(token: string): string {
  return `${getAppOrigin()}/auth/register-staff?token=${token}`
}

function staffInvitesSetupError(error: { message: string; code?: string }): string | null {
  const msg = error.message.toLowerCase()
  if (
    error.code === '42P01' ||
    msg.includes('staff_invite_tokens') ||
    msg.includes('schema cache')
  ) {
    return 'Team invites are not set up in the database yet. Apply migration 012_staff_invites.sql (supabase db push).'
  }
  return null
}

export async function inviteTeamMember(formData: FormData): Promise<string> {
  const { user, isAdmin } = await requireAdmin()
  if (!isAdmin || !user) throw new Error('Only admins can invite team members')

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const fullName = (formData.get('full_name') as string)?.trim()
  const role = parseStaffRole(formData.get('role') as string)

  if (!email || !fullName) throw new Error('Email and name are required')

  const admin = createAdminClient()

  if (await authUserExists(admin, email)) {
    throw new Error('A user with this email already exists')
  }

  const { data: pending, error: pendingError } = await admin
    .from('staff_invite_tokens')
    .select('id, token, full_name, role')
    .eq('email', email)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (pendingError) {
    throw new Error(staffInvitesSetupError(pendingError) ?? pendingError.message)
  }

  if (pending) {
    if (pending.full_name !== fullName || pending.role !== role) {
      const { error: updateError } = await admin
        .from('staff_invite_tokens')
        .update({ full_name: fullName, role })
        .eq('id', pending.id)

      if (updateError) {
        throw new Error(updateError.message)
      }
    }
    revalidatePath('/admin/team')
    return staffInviteUrl(pending.token)
  }

  const { data: token, error } = await admin
    .from('staff_invite_tokens')
    .insert({
      email,
      full_name: fullName,
      role,
      invited_by: user.id,
    })
    .select('token')
    .single()

  if (error || !token?.token) {
    throw new Error(staffInvitesSetupError(error ?? { message: 'Failed to create invite' }) ?? error?.message ?? 'Failed to create invite')
  }

  revalidatePath('/admin/team')
  return staffInviteUrl(token.token)
}

export async function getTeamDirectory(): Promise<{
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
}> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: profiles, error: profilesError }, { data: invites, error: invitesError }] =
    await Promise.all([
      supabase
        .from('users')
        .select('id, role, full_name, created_at')
        .in('role', ['admin', 'agent'])
        .order('created_at', { ascending: true }),
      supabase
        .from('staff_invite_tokens')
        .select('id, email, full_name, role, expires_at, created_at, token')
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ])

  if (profilesError) throw new Error(profilesError.message)

  if (invitesError) {
    throw new Error(staffInvitesSetupError(invitesError) ?? invitesError.message)
  }

  const members = await Promise.all(
    (profiles ?? []).map(async p => ({
      id: p.id,
      email: (await getAuthEmailById(admin, p.id)) ?? '—',
      full_name: p.full_name,
      role: parseStaffRole(p.role),
      created_at: p.created_at ?? '',
    }))
  )

  const pendingInvites =
    invites?.map(i => ({
      id: i.id,
      email: i.email,
      full_name: i.full_name,
      role: parseStaffRole(i.role),
      expires_at: i.expires_at,
      created_at: i.created_at ?? '',
      invite_url: staffInviteUrl(i.token),
    })) ?? []

  return { members, pendingInvites }
}

export async function revokeStaffInvite(inviteId: string): Promise<void> {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) throw new Error('Only admins can revoke invites')

  const admin = createAdminClient()
  const { error } = await admin
    .from('staff_invite_tokens')
    .delete()
    .eq('id', inviteId)
    .eq('used', false)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/team')
}
