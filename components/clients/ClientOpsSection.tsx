import Link from 'next/link'
import { ChevronRight, FileText, FolderKanban, Server } from 'lucide-react'
import quickStyles from '@/components/clients/client-ops-quick-actions.module.css'
import {
  formatHostingContractCost,
  formatHostingDate,
  isExpiringSoon,
} from '@/lib/ops/hosting-maintenance/display'
import { formatOfferCurrency } from '@/lib/ops/financial-offer/calculate'
import type { ClientOpsSummary } from '@/lib/ops/client-ops/service'
import { formatProjectCost, formatProjectDate } from '@/lib/ops/projects/display'
import type { ProjectStatus } from '@/lib/ops/projects/types'
import { formatDateTimeHuman } from '@/lib/tickets/display'

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
}

function ClientOpsQuickActions() {
  return (
    <div className={quickStyles.actions}>
      <Link
        href="/admin/ops/projects/new"
        className={`${quickStyles.btn} ${quickStyles.project}`}
      >
        <FolderKanban size={13} strokeWidth={2.25} aria-hidden />
        <span>New project</span>
      </Link>
      <Link
        href="/admin/ops/financial-offers/new"
        className={`${quickStyles.btn} ${quickStyles.offer}`}
      >
        <FileText size={13} strokeWidth={2.25} aria-hidden />
        <span>New offer</span>
      </Link>
      <Link
        href="/admin/ops/hosting-maintenance/new"
        className={`${quickStyles.btn} ${quickStyles.hosting}`}
      >
        <Server size={13} strokeWidth={2.25} aria-hidden />
        <span>New hosting</span>
      </Link>
    </div>
  )
}

export function ClientOpsSection({ ops }: { ops: ClientOpsSummary }) {
  const hasAny = ops.projects.length > 0 || ops.offers.length > 0 || ops.hosting.length > 0

  if (!hasAny) {
    return (
      <section className="client-ops-section space-y-3 anim-fade-up anim-fade-up-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="dash-section-title">Operations</h2>
          <ClientOpsQuickActions />
        </div>
        <div className="dash-empty">
          <p className="dash-empty-title">No OPS records yet</p>
          <p className="dash-empty-hint">
            Create a financial offer, project, or hosting contract linked to this client.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="client-ops-section space-y-6 anim-fade-up anim-fade-up-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="dash-section-title">Operations</h2>
        <ClientOpsQuickActions />
      </div>

      {ops.projects.length > 0 ? (
        <div className="client-ops-block">
          <div className="client-ops-block-head">
            <h3 className="client-ops-block-title">Projects</h3>
            <Link href="/admin/ops/projects" className="dash-link-accent text-sm">
              All projects →
            </Link>
          </div>
          <div className="client-ops-list">
            {ops.projects.map(project => {
              const pct =
                project.taskCount > 0
                  ? Math.round((project.doneTaskCount / project.taskCount) * 100)
                  : 0
              return (
                <Link
                  key={project.id}
                  href={`/admin/ops/projects/${project.id}`}
                  className="client-ops-row"
                >
                  <div className="client-ops-row-main">
                    <span className="client-ops-row-title">{project.name}</span>
                    <span className={`client-ops-pill client-ops-pill--${project.status}`}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <span className="client-ops-row-meta tabular-nums">
                    {pct}% · {formatProjectCost(project.costAmount)}
                  </span>
                  <span className="client-ops-row-meta tabular-nums">
                    {formatProjectDate(project.targetDate)}
                  </span>
                  <ChevronRight size={16} className="client-ops-row-chevron" aria-hidden />
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}

      {ops.offers.length > 0 ? (
        <div className="client-ops-block">
          <div className="client-ops-block-head">
            <h3 className="client-ops-block-title">Financial offers</h3>
            <Link href="/admin/ops/financial-offers" className="dash-link-accent text-sm">
              All offers →
            </Link>
          </div>
          <div className="client-ops-list">
            {ops.offers.map(offer => (
              <Link
                key={offer.id}
                href={`/admin/ops/financial-offers/${offer.id}`}
                className="client-ops-row"
              >
                <div className="client-ops-row-main">
                  <span className="client-ops-row-title">{offer.clientName}</span>
                  <span
                    className={`client-ops-pill client-ops-pill--${offer.status === 'accepted' ? 'accepted' : 'open'}`}
                  >
                    {offer.status === 'accepted' ? 'Accepted' : 'Open'}
                  </span>
                </div>
                <span className="client-ops-row-meta tabular-nums">
                  {formatOfferCurrency(offer.totalAmount)}
                </span>
                <span className="client-ops-row-meta">
                  {formatDateTimeHuman(offer.createdAt)}
                </span>
                <ChevronRight size={16} className="client-ops-row-chevron" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {ops.hosting.length > 0 ? (
        <div className="client-ops-block">
          <div className="client-ops-block-head">
            <h3 className="client-ops-block-title">Hosting & maintenance</h3>
            <Link href="/admin/ops/hosting-maintenance" className="dash-link-accent text-sm">
              All contracts →
            </Link>
          </div>
          <div className="client-ops-list">
            {ops.hosting.map(contract => {
              const expiring = isExpiringSoon(contract.periodEnd, contract.status)
              return (
                <Link
                  key={contract.id}
                  href={`/admin/ops/hosting-maintenance/${contract.id}`}
                  className={`client-ops-row${expiring ? ' client-ops-row--warn' : ''}`}
                >
                  <div className="client-ops-row-main">
                    <span className="client-ops-row-title">{contract.name}</span>
                    <span className={`client-ops-pill client-ops-pill--${contract.status}`}>
                      {contract.status}
                    </span>
                  </div>
                  <span className="client-ops-row-meta tabular-nums">
                    {formatHostingContractCost(
                      contract.costAmount,
                      contract.periodType,
                      contract.customPeriod
                    )}
                  </span>
                  <span className="client-ops-row-meta tabular-nums">
                    {formatHostingDate(contract.periodEnd)}
                  </span>
                  <ChevronRight size={16} className="client-ops-row-chevron" aria-hidden />
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}
