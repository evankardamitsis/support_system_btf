/**
 * Supabase API keys (Dashboard → Project Settings → API Keys).
 * - Publishable (`sb_publishable_…`) — client, RLS applies → NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * - Secret (`sb_secret_…`) — server only, elevated → SUPABASE_SECRET_KEY
 *
 * Legacy JWT `service_role` still works if set as SUPABASE_SERVICE_ROLE_KEY during migration.
 */
export function getSupabaseSecretKey(): string {
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'SUPABASE_SECRET_KEY is required for team invites (server-only). ' +
        'In Supabase: API Keys → Secret keys. Do not expose this in the browser.'
    )
  }
  return key
}
