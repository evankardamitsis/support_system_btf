import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Best-effort auth user listing — never throws. */
export async function listAuthUsers(
  admin: SupabaseClient
): Promise<User[]> {
  try {
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (error) return []
    return data?.users ?? []
  } catch {
    return []
  }
}

export async function authUserExists(
  admin: SupabaseClient,
  email: string
): Promise<boolean> {
  const target = normalizeEmail(email)
  const users = await listAuthUsers(admin)
  return users.some(u => u.email?.toLowerCase() === target)
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
