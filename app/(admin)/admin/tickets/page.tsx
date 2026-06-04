import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { DashButton } from '@/components/dashboard/DashButton'
import { TicketsTable } from '@/components/tickets/TicketsTable'
import { TicketsTableToolbar } from '@/components/tickets/TicketsTableToolbar'
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
  searchParams: Promise<{ status?: string; priority?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  const { data: all } = await supabase
    .from('tickets')
    .select('id, status, priority, title, type, created_at, updated_at, clients(name)')
    .order('updated_at', { ascending: false })

  const counts = {
    '': all?.length ?? 0,
    open: all?.filter(t => t.status === 'open').length ?? 0,
    in_progress: all?.filter(t => t.status === 'in_progress').length ?? 0,
    waiting_on_client: all?.filter(t => t.status === 'waiting_on_client').length ?? 0,
    resolved: all?.filter(t => t.status === 'resolved').length ?? 0,
  }

  let tickets = all ?? []
  if (filters.status) tickets = tickets.filter(t => t.status === filters.status)
  if (filters.priority) tickets = tickets.filter(t => t.priority === filters.priority)

  const activeStatus = filters.status ?? ''

  const rows = tickets.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status as TicketStatus,
    priority: t.priority as TicketPriority,
    type: t.type,
    updated_at: t.updated_at,
    clientName: (t.clients as unknown as { name: string } | null)?.name ?? null,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ticket queue"
        description="Status and priority first — click any row to open. Sorted by last activity."
        action={
          <DashButton href="/admin/tickets/new">
            <Plus size={14} />
            New ticket
          </DashButton>
        }
      />

      <section className="tickets-workspace anim-fade-up anim-fade-up-3">
        <TicketsTableToolbar
          basePath="/admin/tickets"
          tabs={statusTabs.map(tab => ({
            ...tab,
            count: counts[tab.value as keyof typeof counts],
          }))}
          activeStatus={activeStatus}
          priority={filters.priority}
          totalShown={rows.length}
          showPriorityFilter
        />

        <TicketsTable
          tickets={rows}
          hrefPrefix="/admin/tickets"
          variant="admin"
          emptyTitle={
            filters.status || filters.priority
              ? 'No tickets match these filters'
              : 'No tickets yet'
          }
          emptyHint={
            filters.status || filters.priority
              ? 'Change status or priority above'
              : 'Create a ticket to get started'
          }
        />
      </section>
    </div>
  )
}
