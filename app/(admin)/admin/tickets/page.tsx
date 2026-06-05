import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { DashButton } from '@/components/dashboard/DashButton'
import { TicketAnalyticsStrip } from '@/components/tickets/TicketAnalyticsStrip'
import { TicketsTable } from '@/components/tickets/TicketsTable'
import { TicketsTableToolbar } from '@/components/tickets/TicketsTableToolbar'
import { computeTicketAnalytics } from '@/lib/tickets/analytics'
import { Plus } from 'lucide-react'
import type { TicketStatus, TicketPriority } from '@/lib/types'

const statusTabs = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Waiting', value: 'waiting_on_client' },
  { label: 'Resolved', value: 'resolved' },
]

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; client?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  const [{ data: all }, { data: clientRows }, { data: hourLogs }] = await Promise.all([
    supabase
      .from('tickets')
      .select(
        'id, client_id, status, priority, title, type, created_at, updated_at, resolved_at, estimated_hours, actual_hours, estimate_status, clients(name)'
      )
      .order('updated_at', { ascending: false }),
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('hours_log').select('ticket_id'),
  ])

  const hoursLoggedByTicketId: Record<string, boolean> = {}
  for (const row of hourLogs ?? []) {
    hoursLoggedByTicketId[row.ticket_id] = true
  }

  const clients = clientRows ?? []
  const activeClient = filters.client ?? ''
  const clientName = activeClient
    ? clients.find(c => c.id === activeClient)?.name
    : undefined

  let scoped = all ?? []
  if (activeClient) {
    scoped = scoped.filter(t => t.client_id === activeClient)
  }

  const counts = {
    '': scoped.length,
    open: scoped.filter(t => t.status === 'open').length,
    in_progress: scoped.filter(t => t.status === 'in_progress').length,
    waiting_on_client: scoped.filter(t => t.status === 'waiting_on_client').length,
    resolved: scoped.filter(t => t.status === 'resolved').length,
  }

  let tickets = scoped
  if (filters.status) tickets = tickets.filter(t => t.status === filters.status)
  if (filters.priority) tickets = tickets.filter(t => t.priority === filters.priority)

  const activeStatus = filters.status ?? ''
  const hasFilters = Boolean(filters.status || filters.priority || activeClient)

  const analytics = computeTicketAnalytics(
    scoped.map(t => ({
      status: t.status,
      created_at: t.created_at,
      resolved_at: t.resolved_at,
      actual_hours: t.actual_hours != null ? Number(t.actual_hours) : null,
    }))
  )

  const rows = tickets.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status as TicketStatus,
    priority: t.priority as TicketPriority,
    type: t.type,
    updated_at: t.updated_at,
    resolved_at: t.resolved_at,
    estimated_hours: t.estimated_hours != null ? Number(t.estimated_hours) : null,
    actual_hours: t.actual_hours != null ? Number(t.actual_hours) : null,
    estimate_status: t.estimate_status ?? null,
    clientName: (t.clients as unknown as { name: string } | null)?.name ?? null,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ticket queue"
        description={
          clientName
            ? `Tickets for ${clientName} — click any row to open.`
            : 'Status and priority first — click any row to open. Sorted by last activity.'
        }
        action={
          <DashButton
            href={
              activeClient
                ? `/admin/tickets/new?client=${activeClient}`
                : '/admin/tickets/new'
            }
          >
            <Plus size={14} />
            New ticket
          </DashButton>
        }
      />

      <TicketAnalyticsStrip analytics={analytics} />

      <section className="tickets-workspace anim-fade-up anim-fade-up-3">
        <TicketsTableToolbar
          basePath="/admin/tickets"
          tabs={statusTabs.map(tab => ({
            ...tab,
            count: counts[tab.value as keyof typeof counts],
          }))}
          activeStatus={activeStatus}
          priority={filters.priority}
          client={activeClient}
          clients={clients}
          totalShown={rows.length}
          showPriorityFilter
          showClientFilter
        />

        <TicketsTable
          tickets={rows}
          hrefPrefix="/admin/tickets"
          variant="admin"
          hoursLoggedByTicketId={hoursLoggedByTicketId}
          emptyTitle={hasFilters ? 'No tickets match these filters' : 'No tickets yet'}
          emptyHint={
            hasFilters
              ? 'Change status, client, or priority above'
              : 'Create a ticket to get started'
          }
        />
      </section>
    </div>
  )
}
