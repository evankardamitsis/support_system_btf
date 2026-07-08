import { createClient } from '@/lib/supabase/server'
import { isBtfStaffRole } from '@/lib/auth/staff'
import { formatTicketId } from '@/lib/tickets/display'
import { formatDateTime } from '@/lib/dates'
import type { TicketStatus, TicketPriority } from '@/lib/types'

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvEscape).join(',') + '\r\n'
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isBtfStaffRole(profile?.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client') || undefined
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const report = searchParams.get('report') || undefined
  const status = searchParams.get('status') || undefined
  const priority = searchParams.get('priority') || undefined
  const monthlyResolvedReport = report === 'monthly_resolved'

  let query = supabase
    .from('tickets')
    .select(
      'id, title, status, priority, type, no_hours, created_at, updated_at, resolved_at, estimated_hours, actual_hours, assigned_to, clients(name)'
    )
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)
  if (monthlyResolvedReport) {
    query = query.eq('status', 'resolved')
  } else if (status) {
    query = query.eq('status', status as TicketStatus)
  }
  if (priority) query = query.eq('priority', priority as TicketPriority)
  if (monthlyResolvedReport) {
    if (from) query = query.gte('resolved_at', `${from}T00:00:00.000Z`)
    if (to) query = query.lte('resolved_at', `${to}T23:59:59.999Z`)
  } else {
    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`)
    if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`)
  }

  const { data: tickets, error } = await query

  if (error) {
    return new Response(`Failed to load tickets: ${error.message}`, { status: 500 })
  }

  const assigneeIds = [
    ...new Set((tickets ?? []).map(t => t.assigned_to).filter((id): id is string => Boolean(id))),
  ]

  const staffNameById = new Map<string, string>()
  if (assigneeIds.length > 0) {
    const { data: staff } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', assigneeIds)
    for (const member of staff ?? []) {
      staffNameById.set(member.id, member.full_name ?? '')
    }
  }

  const header = toCsvRow([
    'Ticket ID',
    'Title',
    'Client',
    'Status',
    'Priority',
    'Type',
    'Billing Mode',
    'Assigned To',
    'Created',
    'Updated',
    'Resolved',
    'Estimated Hours',
    'Actual Hours',
  ])

  const rows = (tickets ?? []).map(t =>
    toCsvRow([
      formatTicketId(t.id),
      t.title,
      (t.clients as unknown as { name: string } | null)?.name ?? '',
      t.status,
      t.priority,
      t.type,
      t.no_hours ? 'No-hours ticket' : 'Tracked hours',
      t.assigned_to ? staffNameById.get(t.assigned_to) ?? '' : '',
      formatDateTime(t.created_at),
      formatDateTime(t.updated_at),
      t.resolved_at ? formatDateTime(t.resolved_at) : '',
      t.estimated_hours ?? '',
      t.actual_hours ?? '',
    ])
  )

  const totalActualHours = (tickets ?? []).reduce(
    (sum, t) => sum + (t.actual_hours != null ? Number(t.actual_hours) : 0),
    0
  )

  const summary = toCsvRow([
    'Total spent hours for period',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    Math.round(totalActualHours * 100) / 100,
  ])

  const csv = '﻿' + header + rows.join('') + summary

  const today = new Date().toISOString().slice(0, 10)
  const filename = monthlyResolvedReport
    ? `tickets-resolved-report-${today}.csv`
    : `tickets-export-${today}.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
