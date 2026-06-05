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
