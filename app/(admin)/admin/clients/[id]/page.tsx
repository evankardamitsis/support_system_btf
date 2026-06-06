import { formatDate } from '@/lib/dates'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GenerateInviteSection } from './GenerateInviteSection'
import { ClientApprovalRemindersToggle } from '@/components/clients/ClientApprovalRemindersToggle'
import { DeleteClientButton } from '@/components/clients/DeleteClientButton'
import { requireAdmin } from '@/lib/auth/require-admin'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { TicketsTable } from '@/components/tickets/TicketsTable'
import { ClientRetainerSection } from '@/components/retainers/ClientRetainerSection'
import { getRetainerForClient } from '@/lib/retainers/active'
import { retainerTracksHours } from '@/lib/retainers/billing-model'
import { formatPackageName } from '@/lib/retainers/packages'
import { RETAINER_STATUS_LABELS, type RetainerLifecycleStatus } from '@/lib/retainers/status'
import type { TicketStatus, TicketPriority } from '@/lib/types'

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { isAdmin } = await requireAdmin()
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('*').eq('id', id).single()
  if (!client) notFound()

  const [{ data: tickets }, { count: ticketCount }, activeRetainer] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, title, status, priority, type, updated_at')
      .eq('client_id', id)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', id),
    getRetainerForClient(supabase, id, { includePackage: true }),
  ])

  const openTickets = tickets?.filter(t => t.status === 'open' || t.status === 'in_progress').length ?? 0

  const hoursBilling = retainerTracksHours(activeRetainer)
  const ticketRows =
    tickets?.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status as TicketStatus,
      priority: t.priority as TicketPriority,
      type: t.type,
      updated_at: t.updated_at,
      hoursBilling,
    })) ?? []

  return (
    <div className="space-y-8 w-full">
      <Link href="/admin/clients" className="dash-back anim-fade-up anim-fade-up-1">
        ← Back to clients
      </Link>

      <header className="profile-hero anim-fade-up anim-fade-up-2">
        <div className="profile-hero-main">
          <div className="profile-avatar" aria-hidden>
            {client.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="profile-name">{client.name}</h1>
            <p className="profile-meta">
              {client.contact_name ? `${client.contact_name} · ` : ''}
              {client.email}
            </p>
          </div>
        </div>
        <GenerateInviteSection clientId={id} />
      </header>

      <MetricStrip
        foldLabel="Client"
        items={[
          {
            label: 'Package',
            value: activeRetainer?.package_name
              ? formatPackageName(activeRetainer.package_name)
              : client.plan_name ?? '—',
          },
          { label: 'SLA', value: `${client.sla_response_hours ?? 8}h`, hint: 'Response target' },
          { label: 'Contact', value: client.contact_name ?? '—' },
          {
            label: 'Renewal',
            value: formatDate(client.renewal_date),
          },
          {
            label: 'Retainer',
            value: RETAINER_STATUS_LABELS[(client.retainer_status ?? 'active') as RetainerLifecycleStatus],
            accent:
              client.retainer_status === 'frozen'
                ? '#fb923c'
                : client.retainer_status === 'canceled'
                  ? '#f87171'
                  : '#4ade80',
          },
          {
            label: 'Active tickets',
            value: String(openTickets),
            accent: openTickets > 0 ? '#60a5fa' : undefined,
          },
        ]}
      />

      <ClientApprovalRemindersToggle
        clientId={id}
        enabled={client.approval_reminders_enabled ?? true}
        canManage={isAdmin}
      />

      <ClientRetainerSection clientId={id} canManageLifecycle={isAdmin} />

      <section className="space-y-3 anim-fade-up anim-fade-up-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="dash-section-title">Recent tickets</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Link href={`/admin/tickets?client=${id}`} className="dash-link-accent">
              All tickets →
            </Link>
            <Link href={`/admin/tickets/new?client=${id}`} className="dash-link-accent">
              New ticket →
            </Link>
          </div>
        </div>

        <TicketsTable
          tickets={ticketRows}
          hrefPrefix="/admin/tickets"
          variant="admin"
          emptyTitle="No tickets yet"
          emptyHint="Create a ticket for this client"
        />
      </section>

      {isAdmin ? (
        <DeleteClientButton
          clientId={id}
          clientName={client.name}
          ticketCount={ticketCount ?? 0}
        />
      ) : null}
    </div>
  )
}
