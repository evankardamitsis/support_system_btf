'use server'

import { createClient } from '@/lib/supabase/server'
import { tryCreateAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { parseStaffRole } from '@/lib/team/roles'
import {
  clearIncompleteStaffSignup,
  findAuthUserByEmail,
  getAuthEmailById,
} from '@/lib/team/auth-users'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { StaffRole } from '@/lib/team/roles'
import type {
  InviteTeamMemberResult,
  RevokeStaffInviteResult,
  TeamDirectoryResult,
} from '@/lib/team/action-results'
import { sendStaffInviteEmail } from '@/lib/email/staff-invite'

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

function failInvite(error: string): InviteTeamMemberResult {
  return { ok: false, error }
}

async function deliverStaffInvite(input: {
  email: string
  fullName: string
  role: StaffRole
  token: string
}): Promise<InviteTeamMemberResult> {
  const url = staffInviteUrl(input.token)
  const emailResult = await sendStaffInviteEmail({
    to: input.email,
    inviteeName: input.fullName,
    role: input.role,
    inviteUrl: url,
  })

  return {
    ok: true,
    url,
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? null : emailResult.error,
  }
}

async function reusePendingInvite(
  admin: SupabaseClient<Database>,
  email: string,
  fullName: string,
  role: StaffRole
): Promise<InviteTeamMemberResult | null> {
  const { data: pending, error: pendingError } = await admin
    .from('staff_invite_tokens')
    .select('id, token, full_name, role')
    .eq('email', email)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (pendingError) {
    return failInvite(staffInvitesSetupError(pendingError) ?? pendingError.message)
  }

  if (!pending?.token) return null

  if (pending.full_name !== fullName || pending.role !== role) {
    const { error: updateError } = await admin
      .from('staff_invite_tokens')
      .update({ full_name: fullName, role })
      .eq('id', pending.id)

    if (updateError) {
      return failInvite(updateError.message)
    }
  }

  return deliverStaffInvite({
    email,
    fullName,
    role,
    token: pending.token,
  })
}

export async function inviteTeamMember(formData: FormData): Promise<InviteTeamMemberResult> {
  const { user, isAdmin } = await requireAdmin()
  if (!isAdmin || !user) {
    return failInvite('Only admins can invite team members')
  }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const fullName = (formData.get('full_name') as string)?.trim()
  const role = parseStaffRole(formData.get('role') as string)

  if (!email || !fullName) {
    return failInvite('Email and name are required')
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return failInvite(adminResult.error)
  }
  const admin = adminResult.client

  const authUser = await findAuthUserByEmail(admin, email)
  if (authUser) {
    const { data: profile } = await admin
      .from('users')
      .select('role, full_name')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profile?.role === 'admin' || profile?.role === 'agent') {
      const name = profile.full_name?.trim() || 'This user'
      return failInvite(`${name} is already on the team. They can sign in at /auth/login.`)
    }

    if (profile?.role === 'client') {
      return failInvite('This email belongs to a client portal account, not staff.')
    }

    const reusedAfterSignup = await reusePendingInvite(admin, email, fullName, role)
    if (reusedAfterSignup) return reusedAfterSignup

    if (authUser.email_confirmed_at) {
      return failInvite(
        'An account already exists for this email. Ask them to sign in at /auth/login.'
      )
    }

    return failInvite(
      'Signup was started for this email but not confirmed yet. Ask them to check their inbox for the confirmation link.'
    )
  }

  const reused = await reusePendingInvite(admin, email, fullName, role)
  if (reused) return reused

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
    return failInvite(
      staffInvitesSetupError(error ?? { message: 'Failed to create invite' }) ??
        error?.message ??
        'Failed to create invite'
    )
  }

  return deliverStaffInvite({
    email,
    fullName,
    role,
    token: token.token,
  })
}

export async function getTeamDirectory(): Promise<TeamDirectoryResult> {
  const empty: TeamDirectoryResult = {
    members: [],
    pendingInvites: [],
    error: null,
  }

  try {
    const supabase = await createClient()
    const adminResult = tryCreateAdminClient()
    if ('error' in adminResult) {
      return { ...empty, error: adminResult.error }
    }
    const admin = adminResult.client

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

    if (profilesError) {
      return { ...empty, error: profilesError.message }
    }

    if (invitesError) {
      return {
        ...empty,
        error: staffInvitesSetupError(invitesError) ?? invitesError.message,
      }
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

    return { members, pendingInvites, error: null }
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : 'Could not load team directory',
    }
  }
}

export async function revokeStaffInvite(inviteId: string): Promise<RevokeStaffInviteResult> {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return { ok: false, error: 'Only admins can revoke invites' }
  }

  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) {
    return { ok: false, error: adminResult.error }
  }
  const admin = adminResult.client

  const { data: invite, error: fetchError } = await admin
    .from('staff_invite_tokens')
    .select('id, email')
    .eq('id', inviteId)
    .eq('used', false)
    .maybeSingle()

  if (fetchError) {
    return { ok: false, error: fetchError.message }
  }
  if (!invite) {
    return { ok: false, error: 'Invite not found or already used' }
  }

  const { error: deleteError } = await admin
    .from('staff_invite_tokens')
    .delete()
    .eq('id', inviteId)
    .eq('used', false)

  if (deleteError) {
    return { ok: false, error: deleteError.message }
  }

  await clearIncompleteStaffSignup(admin, invite.email)

  return { ok: true }
}
