import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Paginated lookup — more reliable than a single listUsers page. */
export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<User | null> {
  const target = normalizeEmail(email)

  try {
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      })
      if (error || !data?.users?.length) break

      const hit = data.users.find(u => u.email?.toLowerCase() === target)
      if (hit) return hit

      if (data.users.length < 1000) break
    }
  } catch {
    return null
  }

  return null
}

export async function getAuthEmailById(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) return null
    return data.user.email
  } catch {
    return null
  }
}

/**
 * Drop auth (and cascaded profile) for an email left over from a failed staff signup.
 * Skips when a completed invite exists or the account is a client.
 */
export async function clearIncompleteStaffSignup(
  admin: SupabaseClient,
  email: string
): Promise<void> {
  const normalized = normalizeEmail(email)

  const { data: completedInvites } = await admin
    .from('staff_invite_tokens')
    .select('id')
    .eq('email', normalized)
    .eq('used', true)
    .limit(1)

  if (completedInvites?.length) return

  const authUser = await findAuthUserByEmail(admin, normalized)
  if (!authUser) return

  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle()

  if (profile?.role === 'client') return

  try {
    await admin.auth.admin.deleteUser(authUser.id)
  } catch {
    // Best-effort cleanup so revoke still succeeds.
  }
}

/**
 * Drop auth user (and cascaded public.users row) left over from an incomplete
 * client team invite, so the email can be invited again.
 */
export async function clearIncompleteClientTeamSignup(
  admin: SupabaseClient,
  email: string,
  clientId: string
): Promise<void> {
  const normalized = normalizeEmail(email)

  const authUser = await findAuthUserByEmail(admin, normalized)
  if (!authUser) return

  const { data: profile } = await admin
    .from('users')
    .select('role, client_id')
    .eq('id', authUser.id)
    .maybeSingle()

  if (profile?.role === 'admin' || profile?.role === 'agent') return

  if (profile?.role === 'client' && profile.client_id && profile.client_id !== clientId) {
    return
  }

  const { data: consumedInvite } = await admin
    .from('client_invite_tokens')
    .select('id')
    .eq('email', normalized)
    .eq('client_id', clientId)
    .eq('used', true)
    .maybeSingle()

  if (consumedInvite) return

  try {
    await admin.auth.admin.deleteUser(authUser.id)
  } catch {
    // Best-effort cleanup so revoke still succeeds.
  }
}
