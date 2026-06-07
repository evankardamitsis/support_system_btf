import { NextResponse } from 'next/server'
import { isBtfStaffRole } from '@/lib/auth/staff'
import { ensureDmChannel } from '@/lib/comms/stream-server'
import { isStreamConfigured } from '@/lib/comms/stream-config'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  if (!isStreamConfigured()) {
    return NextResponse.json({ error: 'Comms not configured' }, { status: 503 })
  }

  const { userId: otherUserId } = await context.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isBtfStaffRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const channelId = await ensureDmChannel(supabase, user, otherUserId)
    return NextResponse.json({ channelId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not open direct message'
    const status =
      message === 'Staff member not found' || message === 'Cannot message yourself' ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
