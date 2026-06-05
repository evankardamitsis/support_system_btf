import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, client_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client' || !profile.client_id) {
    throw new Error('Not authorized')
  }

  return {
    supabase,
    user,
    profile,
    clientId: profile.client_id,
  }
}
