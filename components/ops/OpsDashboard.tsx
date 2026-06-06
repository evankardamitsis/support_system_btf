import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { OpsQuickActions } from '@/components/ops/OpsQuickActions'
import { formatOfferCurrency } from '@/lib/ops/financial-offer/calculate'
import type { OpsDashboardData } from '@/lib/ops/dashboard/service'
import { formatProjectDate } from '@/lib/ops/projects/display'
import { formatDateTimeHuman } from '@/lib/tickets/display'

const PROJECT_STATUS_LABELS = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
} as const

function attentionToneClass(tone: 'danger' | 'warn' | 'info') {
  return `ops-attention-item ops-attention-item--${tone}`
}

export function OpsDashboard({
  data,
  isAdmin,
}: {
  data: OpsDashboardData
  isAdmin: boolean
}) {
  const attentionRules = isAdmin
    ? 'Active hosting renewing within 14 days · overdue tasks · projects past target · unassigned top-level tasks · open offers not emailed'
    : 'Active hosting renewing within 14 days · open offers not emailed'

  const metricItems = [
    {
      label: 'Open offers',
      value: String(data.openOffersCount),
      hint: data.openOffersCount > 0 ? formatOfferCurrency(data.openOffersValue) : 'Pipeline value',
    },
    {
      label: 'Accepted value',
      value: formatOfferCurrency(data.acceptedSummary.totalValue),
      hint: `${data.acceptedSummary.count} accepted`,
    },
    ...(isAdmin
      ? [
          {
            label: 'Active projects',
            value: String(data.activeProjects.length),
            hint:
              data.overdueTasksCount > 0
                ? `${data.overdueTasksCount} overdue tasks`
                : 'Delivery in progress',
            accent: data.overdueTasksCount > 0 ? '#fb923c' : undefined,
            emphasis: data.overdueTasksCount > 0,
          },
          {
            label: 'Unassigned tasks',
            value: String(data.unassignedTasksCount),
            accent: data.unassignedTasksCount > 0 ? '#60a5fa' : undefined,
            emphasis: data.unassignedTasksCount > 0,
          },
        ]
      : []),
    {
      label: 'Hosting · 14d',
      value: String(data.hostingExpiring14Count),
      hint: 'Renewal window',
      accent: data.hostingExpiring14Count > 0 ? '#fcd34d' : undefined,
      emphasis: data.hostingExpiring14Count > 0,
    },
    {
      label: 'Hosting · 30d',
      value: String(data.hostingExpiring30Count),
      hint: 'Expiring soon',
      accent: data.hostingExpiring30Count > 0 ? '#fb923c' : undefined,
      emphasis: data.hostingExpiring30Count > 0,
    },
  ]

  return (
    <div className="ops-dashboard space-y-6 w-full">
      <PageHeader
        title="Operations"
        description="Morning check-in — pipeline, delivery, and renewals in one place."
        action={<OpsQuickActions showProjects={isAdmin} />}
      />

      <MetricStrip foldLabel="Ops" items={metricItems} />

      {isAdmin ? (
        <section className="ops-dashboard-panel">
          <div className="ops-dashboard-panel-head">
            <h2 className="dash-section-title">Active projects</h2>
            <Link href="/admin/ops/projects" className="dash-link-accent text-sm">
              All projects →
            </Link>
          </div>
          {data.activeProjects.length === 0 ? (
            <div className="dash-empty ops-dashboard-empty">
              <p className="dash-empty-title">No active projects</p>
              <p className="dash-empty-hint">Create a project from a template or accepted offer.</p>
            </div>
          ) : (
            <ul className="ops-dashboard-simple-list">
              {data.activeProjects.map(project => {
                const pct =
                  project.taskCount > 0
                    ? Math.round((project.doneTaskCount / project.taskCount) * 100)
                    : 0
                return (
                  <li key={project.id}>
                    <Link href={`/admin/ops/projects/${project.id}`} className="ops-dashboard-simple-row">
                      <div className="min-w-0">
                        <span className="ops-dashboard-simple-title">{project.name}</span>
                        <span className="ops-dashboard-simple-meta">
                          {project.clientName ?? 'Internal'} ·{' '}
                          {PROJECT_STATUS_LABELS[project.status]} · {pct}% done
                          {project.targetDate ? ` · target ${formatProjectDate(project.targetDate)}` : ''}
                        </span>
                      </div>
                      <ChevronRight size={16} className="ops-dashboard-row-chevron" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}

      <div className="ops-dashboard-grid">
        <section className="ops-dashboard-panel">
          <div className="ops-dashboard-panel-head ops-dashboard-panel-head--stacked">
            <div>
              <h2 className="dash-section-title">Needs attention</h2>
              <p className="ops-dashboard-attention-rules">{attentionRules}</p>
            </div>
            <span className="ops-dashboard-panel-meta">{data.attentionItems.length} items</span>
          </div>
          {data.attentionItems.length === 0 ? (
            <div className="dash-empty ops-dashboard-empty">
              <p className="dash-empty-title">All clear</p>
              <p className="dash-empty-hint">No overdue tasks, renewals, or open follow-ups right now.</p>
            </div>
          ) : (
            <ul className="ops-attention-list">
              {data.attentionItems.map(item => (
                <li key={item.id}>
                  <Link href={item.href} className={attentionToneClass(item.tone)}>
                    <div className="ops-attention-copy">
                      <span className="ops-attention-kind">{item.kind}</span>
                      <span className="ops-attention-title">{item.title}</span>
                      <span className="ops-attention-meta">{item.meta}</span>
                    </div>
                    <ChevronRight size={16} className="ops-attention-chevron" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ops-dashboard-panel">
          <div className="ops-dashboard-panel-head">
            <h2 className="dash-section-title">Recently accepted</h2>
            <Link href="/admin/ops/financial-offers" className="dash-link-accent text-sm">
              All offers →
            </Link>
          </div>
          {data.recentAcceptedOffers.length === 0 ? (
            <div className="dash-empty ops-dashboard-empty">
              <p className="dash-empty-title">No accepted offers yet</p>
              <p className="dash-empty-hint">Accepted offers show up here with project totals.</p>
            </div>
          ) : (
            <ul className="ops-dashboard-simple-list">
              {data.recentAcceptedOffers.map(offer => (
                <li key={offer.id}>
                  <Link href={`/admin/ops/financial-offers/${offer.id}`} className="ops-dashboard-simple-row">
                    <div className="min-w-0">
                      <span className="ops-dashboard-simple-title">{offer.clientName}</span>
                      <span className="ops-dashboard-simple-meta">
                        {offer.acceptedAt ? formatDateTimeHuman(offer.acceptedAt) : 'Accepted'}
                      </span>
                    </div>
                    <span className="ops-dashboard-simple-value tabular-nums">
                      {formatOfferCurrency(offer.totalAmount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
