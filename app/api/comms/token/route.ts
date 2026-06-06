import { NextResponse } from 'next/server'
import { isBtfStaffRole } from '@/lib/auth/staff'
import { getStreamCommsCredentials } from '@/lib/comms/stream-server'
import { isStreamConfigured } from '@/lib/comms/stream-config'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  if (!isStreamConfigured()) {
    return NextResponse.json({ error: 'Comms not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!isBtfStaffRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const credentials = await getStreamCommsCredentials(supabase, user, profile)
    return NextResponse.json(credentials)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not initialize comms'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
