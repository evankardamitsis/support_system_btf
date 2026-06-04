import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GenerateInviteSection } from './GenerateInviteSection'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { StatusFlag } from '@/components/dashboard/StatusFlag'
import { TicketsTable } from '@/components/tickets/TicketsTable'
import type { TicketStatus, TicketPriority } from '@/lib/types'

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('*').eq('id', id).single()
  if (!client) notFound()

  const [{ data: retainers }, { data: tickets }] = await Promise.all([
    supabase.from('retainers').select('*').eq('client_id', id).order('period_start', { ascending: false }),
    supabase
      .from('tickets')
      .select('id, title, status, priority, type, updated_at')
      .eq('client_id', id)
      .order('updated_at', { ascending: false })
      .limit(20),
  ])

  const r = retainers?.[0]
  const hoursUsed = r ? Number(r.hours_used) : 0
  const hoursTotal = r ? Number(r.hours_total) : 0
  const hoursRemaining = hoursTotal - hoursUsed
  const pct = hoursTotal > 0 ? Math.min(100, (hoursUsed / hoursTotal) * 100) : 0
  const isOver = hoursRemaining < 0
  const isDanger = pct > 85
  const tone = isOver ? 'over' : isDanger ? 'warn' : 'ok'

  const openTickets = tickets?.filter(t => t.status === 'open' || t.status === 'in_progress').length ?? 0

  const ticketRows =
    tickets?.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status as TicketStatus,
      priority: t.priority as TicketPriority,
      type: t.type,
      updated_at: t.updated_at,
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
        items={[
          { label: 'Plan', value: client.plan_name ?? '—' },
          { label: 'SLA', value: `${client.sla_response_hours ?? 8}h`, hint: 'Response target' },
          { label: 'Contact', value: client.contact_name ?? '—' },
          {
            label: 'Renewal',
            value: client.renewal_date
              ? new Date(client.renewal_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—',
          },
          {
            label: 'Active tickets',
            value: String(openTickets),
            accent: openTickets > 0 ? '#60a5fa' : undefined,
          },
        ]}
      />

      {r ? (
        <section
          className={`retainer-panel anim-fade-up anim-fade-up-4`}
          data-alert={isDanger ? 'true' : undefined}
        >
          <div className="retainer-panel-head">
            <div>
              <p className="retainer-panel-title">Active retainer</p>
              {isDanger ? (
                <StatusFlag
                  label={isOver ? 'Over capacity' : `${Math.round(pct)}% consumed`}
                  tone={isOver ? 'danger' : 'warn'}
                />
              ) : null}
            </div>
            <p className="retainer-panel-period tabular-nums">
              {new Date(r.period_start).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
              {' – '}
              {new Date(r.period_end).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="retainer-panel-stats">
            <div className="retainer-stat-block">
              <p className="retainer-stat-label">Used</p>
              <p className="retainer-stat-value">{hoursUsed.toFixed(1)}h</p>
            </div>
            <div className="retainer-stat-block">
              <p className="retainer-stat-label">Remaining</p>
              <p className="retainer-stat-value" data-tone={tone}>
                {isOver ? '−' : ''}
                {Math.abs(hoursRemaining).toFixed(1)}h
              </p>
            </div>
            <div className="retainer-stat-block">
              <p className="retainer-stat-label">Total sold</p>
              <p className="retainer-stat-value">{hoursTotal.toFixed(0)}h</p>
            </div>
          </div>

          <div>
            <div className="retainer-usage-head">
              <span>Hours consumed</span>
              <span className="tabular-nums" style={{ color: isDanger ? '#fb923c' : 'var(--text-2)' }}>
                {Math.round(pct)}%
              </span>
            </div>
            <UsageBar percent={pct} tone={tone} height={8} />
          </div>
        </section>
      ) : (
        <div className="retainer-panel dash-empty anim-fade-up anim-fade-up-4">
          <p className="dash-empty-title">No retainer period</p>
          <p className="dash-empty-hint">Add hours when creating a client or start a new period.</p>
        </div>
      )}

      <section className="space-y-3 anim-fade-up anim-fade-up-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="dash-section-title">Recent tickets</h2>
          <Link href={`/admin/tickets/new?client=${id}`} className="dash-link-accent">
            New ticket →
          </Link>
        </div>

        <TicketsTable
          tickets={ticketRows}
          hrefPrefix="/admin/tickets"
          variant="admin"
          emptyTitle="No tickets yet"
          emptyHint="Create a ticket for this client"
        />
      </section>
    </div>
  )
}
