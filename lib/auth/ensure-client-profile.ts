import { tryCreateAdminClient } from '@/lib/supabase/admin'

type ClientProfile = {
  role: 'client'
  client_id: string
  full_name: string | null
}

/** Link an auth user to their client row when signup profile write was missed. */
export async function ensureClientProfile(
  userId: string,
  email: string
): Promise<ClientProfile | null> {
  const adminResult = tryCreateAdminClient()
  if ('error' in adminResult) return null
  const admin = adminResult.client

  const { data: existing } = await admin
    .from('users')
    .select('role, client_id, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (existing?.role === 'client' && existing.client_id) {
    return {
      role: 'client',
      client_id: existing.client_id,
      full_name: existing.full_name,
    }
  }

  if (existing?.role === 'admin' || existing?.role === 'agent') {
    return null
  }

  const normalizedEmail = email.trim().toLowerCase()
  const { data: client } = await admin
    .from('clients')
    .select('id, name, contact_name')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (!client) return null

  const fullName = client.contact_name?.trim() || client.name
  const { error } = await admin.from('users').upsert(
    {
      id: userId,
      role: 'client',
      client_id: client.id,
      full_name: fullName,
    },
    { onConflict: 'id' }
  )

  if (error) return null

  return { role: 'client', client_id: client.id, full_name: fullName }
}
