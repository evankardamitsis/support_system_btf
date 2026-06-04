import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getSupabaseSecretKey } from '@/lib/supabase/keys'

/** Server-only Supabase client using the secret key (elevated access). */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }
  return createClient<Database>(url, getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
