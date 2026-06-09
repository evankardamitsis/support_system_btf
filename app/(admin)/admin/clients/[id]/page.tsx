import { formatDate } from '@/lib/dates'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GenerateInviteSection } from './GenerateInviteSection'
import { ClientApprovalRemindersToggle } from '@/components/clients/ClientApprovalRemindersToggle'
import { EditClientForm } from '@/components/clients/EditClientForm'
import { AdminClientTeamPanel } from '@/components/clients/AdminClientTeamPanel'
import { getClientTeamDirectoryForAdmin } from '@/app/actions/client-team'
import { ClientPortalStatusBadge } from '@/components/clients/ClientPortalStatusBadge'
import { DeleteClientButton } from '@/components/clients/DeleteClientButton'
import { getClientPortalRegistrationStatus } from '@/lib/clients/portal-registration'
import { requireAdmin } from '@/lib/auth/require-admin'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { TicketsTable } from '@/components/tickets/TicketsTable'
import { ClientHostingLifecycleSection } from '@/components/clients/ClientHostingLifecycleSection'
import { ClientOpsSection } from '@/components/clients/ClientOpsSection'
import { ClientRetainerSection } from '@/components/retainers/ClientRetainerSection'
import { getClientOpsSummary } from '@/lib/ops/client-ops/service'
import { isExpiringSoon } from '@/lib/ops/hosting-maintenance/display'
import { HOSTING_CONTRACT_STATUS_LABELS } from '@/lib/ops/hosting-maintenance/types'
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

  const [
    { data: tickets },
    { count: ticketCount },
    activeRetainer,
    clientOps,
    clientTeam,
    { data: legacyInvite },
  ] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, title, status, priority, type, updated_at')
      .eq('client_id', id)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('client_id', id),
    getRetainerForClient(supabase, id, { includePackage: true }),
    getClientOpsSummary(supabase, id, client.name),
    getClientTeamDirectoryForAdmin(id),
    supabase
      .from('invite_tokens')
      .select('id')
      .eq('client_id', id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle(),
  ])

  const portalStatus = getClientPortalRegistrationStatus(clientTeam, {
    hasLegacyInvitePending: Boolean(legacyInvite),
  })

  const openTickets = tickets?.filter(t => t.status === 'open' || t.status === 'in_progress').length ?? 0
  const hasActiveHosting = clientOps.hosting.some(contract => contract.status === 'active')
  const primaryHosting =
    clientOps.hosting.find(contract => contract.status === 'active') ?? clientOps.hosting[0] ?? null
  const retainerStatus = (client.retainer_status ?? 'active') as RetainerLifecycleStatus
  const hasRetainer = Boolean(activeRetainer)

  const billingMetric = hasActiveHosting
    ? { label: 'Hosting', value: 'Active', accent: '#fcd34d' }
    : hasRetainer
      ? {
          label: 'Retainer',
          value: RETAINER_STATUS_LABELS[retainerStatus],
          accent:
            retainerStatus === 'frozen'
              ? '#fb923c'
              : retainerStatus === 'canceled'
                ? '#f87171'
                : '#4ade80',
        }
      : primaryHosting
        ? {
            label: 'Hosting',
            value: HOSTING_CONTRACT_STATUS_LABELS[primaryHosting.status],
            accent:
              primaryHosting.status === 'active'
                ? '#fcd34d'
                : primaryHosting.status === 'expired'
                  ? '#fb923c'
                  : '#f87171',
          }
        : null

  const packageValue = activeRetainer?.package_name
    ? formatPackageName(activeRetainer.package_name)
    : client.plan_name?.trim() || null

  const packageMetric = packageValue ? { label: 'Package', value: packageValue } : null

  const activeHostingContracts = clientOps.hosting.filter(contract => contract.status === 'active')
  const nextHostingRenewal =
    activeHostingContracts.length > 0
      ? [...activeHostingContracts].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))[0]
      : null

  const renewalMetric = nextHostingRenewal
    ? {
        label: 'Renewal',
        value: formatDate(nextHostingRenewal.periodEnd),
        hint: 'Hosting period end',
        accent: isExpiringSoon(nextHostingRenewal.periodEnd, nextHostingRenewal.status)
          ? '#fb923c'
          : undefined,
        emphasis: isExpiringSoon(nextHostingRenewal.periodEnd, nextHostingRenewal.status),
      }
    : client.renewal_date
      ? { label: 'Renewal', value: formatDate(client.renewal_date) }
      : null

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
            <div className="profile-name-row">
              <h1 className="profile-name">{client.name}</h1>
              {!clientTeam.error ? <ClientPortalStatusBadge status={portalStatus} /> : null}
            </div>
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
          ...(packageMetric ? [packageMetric] : []),
          { label: 'SLA', value: `${client.sla_response_hours ?? 8}h`, hint: 'Response target' },
          { label: 'Contact', value: client.contact_name ?? '—' },
          ...(renewalMetric ? [renewalMetric] : []),
          ...(billingMetric ? [billingMetric] : []),
          {
            label: 'Active tickets',
            value: String(openTickets),
            accent: openTickets > 0 ? '#60a5fa' : undefined,
          },
        ]}
      />

      <EditClientForm
        client={{
          id,
          name: client.name,
          email: client.email,
          contact_name: client.contact_name,
          billing_cycle_day: client.billing_cycle_day,
          sla_response_hours: client.sla_response_hours,
        }}
      />

      <ClientApprovalRemindersToggle
        clientId={id}
        enabled={client.approval_reminders_enabled ?? true}
        canManage={isAdmin}
      />

      <AdminClientTeamPanel clientId={id} directory={clientTeam} />

      {hasRetainer || client.plan_name?.trim() || isAdmin ? (
        <ClientRetainerSection clientId={id} canManageLifecycle={isAdmin} />
      ) : clientOps.hosting.length > 0 ? (
        <ClientHostingLifecycleSection contracts={clientOps.hosting} />
      ) : null}

      <ClientOpsSection ops={clientOps} clientId={id} />

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
