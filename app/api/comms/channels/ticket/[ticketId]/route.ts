import { NextResponse } from 'next/server'
import { isBtfStaffRole } from '@/lib/auth/staff'
import { deleteTicketChannel, ensureTicketChannel } from '@/lib/comms/stream-server'
import { isStreamConfigured } from '@/lib/comms/stream-config'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ ticketId: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  if (!isStreamConfigured()) {
    return NextResponse.json({ error: 'Comms not configured' }, { status: 503 })
  }

  const { ticketId } = await context.params

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
    const channelId = await ensureTicketChannel(supabase, user, ticketId)
    return NextResponse.json({ channelId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not open ticket chat'
    const status = message === 'Ticket not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isStreamConfigured()) {
    return NextResponse.json({ error: 'Comms not configured' }, { status: 503 })
  }

  const { ticketId } = await context.params

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
    const channelId = await deleteTicketChannel(supabase, ticketId)
    return NextResponse.json({ channelId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete ticket chat'
    const status = message === 'Ticket not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
