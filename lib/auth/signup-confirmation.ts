import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { registerInvitedPortalUser } from '@/lib/auth/register-invited-user'

export type RegisterInvitedAuthUserResult =
  | { ok: true; session: true; userId: string }
  | { ok: false; error: string; alreadyConfirmed?: boolean }

type RegisterInvitedAuthUserInput = {
  supabase: SupabaseClient<Database>
  admin: SupabaseClient<Database>
  email: string
  password: string
  fullName: string
}

/** Sign up an invited user — email is pre-confirmed via admin API (no Supabase auth email). */
export async function registerInvitedAuthUser(
  input: RegisterInvitedAuthUserInput
): Promise<RegisterInvitedAuthUserResult> {
  return registerInvitedPortalUser(input)
}
