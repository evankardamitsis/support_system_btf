'use server'

import { createClient } from '@/lib/supabase/server'
import { finalizeRegistration } from '@/lib/auth/finalize-registration'
import { getPostLoginPath } from '@/lib/auth/post-login'
import { requestPasswordReset as sendPasswordResetEmail } from '@/lib/auth/request-password-reset'

/** After email confirmation (hash or PKCE), finish invite + return dashboard path. */
export async function completeAuthRedirect(): Promise<string> {
  const supabase = await createClient()
  await finalizeRegistration(supabase)
  return getPostLoginPath(supabase)
}

export async function requestPasswordReset(email: string) {
  return sendPasswordResetEmail(email)
}
