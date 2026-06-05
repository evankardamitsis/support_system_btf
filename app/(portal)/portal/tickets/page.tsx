import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { DashButton } from '@/components/dashboard/DashButton'
import { TicketsTable } from '@/components/tickets/TicketsTable'
import { TicketsTableToolbar } from '@/components/tickets/TicketsTableToolbar'
import { Plus } from 'lucide-react'
import type { TicketStatus, TicketPriority } from '@/lib/types'

const filterTabs = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
]

export default async function PortalTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user!.id)
    .single()

  const { data: all } = await supabase
    .from('tickets')
    .select('id, title, status, priority, type, created_at, updated_at, resolved_at, estimate_status')
    .eq('client_id', profile!.client_id!)
    .order('updated_at', { ascending: false })

  const counts = {
    '': all?.length ?? 0,
    open: all?.filter(t => t.status === 'open').length ?? 0,
    in_progress: all?.filter(t => t.status === 'in_progress').length ?? 0,
    resolved: all?.filter(t => t.status === 'resolved').length ?? 0,
  }

  let tickets = all ?? []
  if (filters.status) {
    tickets = tickets.filter(t => t.status === filters.status)
  }

  const activeStatus = filters.status ?? ''

  const rows = tickets.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status as TicketStatus,
    priority: t.priority as TicketPriority,
    type: t.type,
    updated_at: t.updated_at,
    resolved_at: t.resolved_at,
    estimate_status: t.estimate_status ?? null,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="My tickets"
        description="See where each request stands — click a row for the full thread."
        action={
          <span data-onboarding="new-request" className="inline-flex">
            <DashButton href="/portal/tickets/new">
              <Plus size={15} />
              New request
            </DashButton>
          </span>
        }
      />

      <section
        className="tickets-workspace anim-fade-up anim-fade-up-3"
        data-onboarding="ticket-list"
      >
        <TicketsTableToolbar
          basePath="/portal/tickets"
          tabs={filterTabs.map(tab => ({
            ...tab,
            count: counts[tab.value as keyof typeof counts],
          }))}
          activeStatus={activeStatus}
          totalShown={rows.length}
        />

        <TicketsTable
          tickets={rows}
          hrefPrefix="/portal/tickets"
          variant="portal"
          emptyTitle={
            filters.status ? 'No tickets match this filter' : 'No tickets yet'
          }
          emptyHint={
            filters.status
              ? 'Try another status tab'
              : 'Submit a request and we will get on it'
          }
        />
      </section>
    </div>
  )
}
