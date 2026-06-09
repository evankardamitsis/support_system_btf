import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { DashButton } from '@/components/dashboard/DashButton'
import { TicketAnalyticsStrip } from '@/components/tickets/TicketAnalyticsStrip'
import { TicketsTable } from '@/components/tickets/TicketsTable'
import { TicketsTableToolbar } from '@/components/tickets/TicketsTableToolbar'
import { computeTicketAnalytics } from '@/lib/tickets/analytics'
import { Plus } from 'lucide-react'
import type { TicketStatus, TicketPriority } from '@/lib/types'
import { hourBillingByClientFromRetainers } from '@/lib/retainers/billing-model'
import { ticketUsesHourBilling } from '@/lib/tickets/hours-billing'
import { getStaffForMentions } from '@/app/actions/comments'
import { isResolvedQueueStatus } from '@/lib/tickets/query'

function matchesAssigneeFilter(
  assignedTo: string | null,
  filter: string | undefined,
  currentUserId: string | undefined
): boolean {
  if (!filter) return true
  if (filter === 'me') return assignedTo === currentUserId
  if (filter === 'unassigned') return assignedTo == null
  return assignedTo === filter
}

const statusTabs = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Waiting', value: 'waiting_on_client' },
]

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    priority?: string
    client?: string
    assigned?: string
    showResolved?: string
  }>
}) {
  const filters = await searchParams
  const showResolved = filters.showResolved === '1'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: all }, { data: clientRows }, { data: hourLogs }, { data: retainerRows }, staff] =
    await Promise.all([
    supabase
      .from('tickets')
      .select(
        'id, client_id, assigned_to, status, priority, title, type, created_at, updated_at, resolved_at, estimated_hours, actual_hours, estimate_status, completion_status, no_hours, clients(name)'
      )
      .order('updated_at', { ascending: false }),
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('hours_log').select('ticket_id'),
    supabase
      .from('retainers')
      .select('client_id, package_name, hours_limited, period_start, period_end'),
    getStaffForMentions(),
  ])

  const staffNameById = new Map(staff.map(member => [member.id, member.name]))

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

  const queueBase = showResolved
    ? scoped
    : scoped.filter(t => !isResolvedQueueStatus(t.status))

  const counts = {
    '': queueBase.length,
    open: queueBase.filter(t => t.status === 'open').length,
    in_progress: queueBase.filter(t => t.status === 'in_progress').length,
    waiting_on_client: queueBase.filter(t => t.status === 'waiting_on_client').length,
  }

  const resolvedCount = scoped.filter(t => isResolvedQueueStatus(t.status)).length

  const mineCount = queueBase.filter(t =>
    matchesAssigneeFilter(t.assigned_to ?? null, 'me', user?.id)
  ).length

  let tickets = showResolved ? scoped : scoped.filter(t => !isResolvedQueueStatus(t.status))
  if (filters.status) tickets = tickets.filter(t => t.status === filters.status)
  if (filters.priority) tickets = tickets.filter(t => t.priority === filters.priority)
  if (filters.assigned) {
    tickets = tickets.filter(t =>
      matchesAssigneeFilter(t.assigned_to ?? null, filters.assigned, user?.id)
    )
  }

  const activeStatus = filters.status ?? ''
  const activeAssigned = filters.assigned ?? ''
  const hasFilters = Boolean(
    filters.status || filters.priority || activeClient || activeAssigned || showResolved
  )
  const assignedLabel =
    activeAssigned === 'me'
      ? 'assigned to you'
      : activeAssigned === 'unassigned'
        ? 'unassigned'
        : activeAssigned
          ? `assigned to ${staffNameById.get(activeAssigned) ?? 'teammate'}`
          : null

  const analytics = computeTicketAnalytics(
    scoped.map(t => ({
      status: t.status,
      created_at: t.created_at,
      resolved_at: t.resolved_at,
      actual_hours: t.actual_hours != null ? Number(t.actual_hours) : null,
    }))
  )

  const clientIds = [...new Set(scoped.map(t => t.client_id))]
  const hoursBillingByClient = hourBillingByClientFromRetainers(retainerRows ?? [], clientIds)

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
    completion_status: t.completion_status ?? null,
    clientName: (t.clients as unknown as { name: string } | null)?.name ?? null,
    hoursBilling: ticketUsesHourBilling(
      hoursBillingByClient[t.client_id] ?? true,
      t.no_hours
    ),
    assignedTo: t.assigned_to ?? null,
    assigneeName: t.assigned_to ? (staffNameById.get(t.assigned_to) ?? null) : null,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ticket queue"
        description={
          clientName && assignedLabel
            ? `Tickets for ${clientName}, ${assignedLabel} — click any row to open.`
            : clientName
              ? `Tickets for ${clientName} — click any row to open.`
              : assignedLabel
                ? `Tickets ${assignedLabel} — click any row to open. Sorted by last activity.`
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
          assigned={activeAssigned}
          showResolved={showResolved}
          resolvedCount={resolvedCount}
          clients={clients}
          staff={staff}
          mineCount={mineCount}
          totalShown={rows.length}
          showPriorityFilter
          showClientFilter
          showAssigneeFilter
          showResolvedToggle
        />

        <TicketsTable
          tickets={rows}
          hrefPrefix="/admin/tickets"
          variant="admin"
          hoursLoggedByTicketId={hoursLoggedByTicketId}
          staff={staff}
          emptyTitle={hasFilters ? 'No tickets match these filters' : 'No tickets yet'}
          emptyHint={
            hasFilters
              ? 'Change status, assignee, client, or priority above'
              : 'Create a ticket to get started'
          }
        />
      </section>
    </div>
  )
}
