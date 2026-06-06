import Link from 'next/link'
import { HostingContractActions } from '@/components/ops/HostingContractActions'
import { StatusFlag } from '@/components/dashboard/StatusFlag'
import { formatDateRange } from '@/lib/dates'
import {
  formatHostingContractCost,
  isExpiringSoon,
} from '@/lib/ops/hosting-maintenance/display'
import {
  HOSTING_CONTRACT_STATUS_LABELS,
  type HostingContractRecord,
  type HostingContractStatus,
} from '@/lib/ops/hosting-maintenance/types'

function hostingStatusTone(status: HostingContractStatus) {
  if (status === 'active') return 'ok' as const
  if (status === 'expired') return 'warn' as const
  return 'danger' as const
}

function hostingStatusMessage(status: HostingContractStatus, expiringSoon: boolean) {
  if (status === 'active') {
    return expiringSoon
      ? 'Contract is active and renewal is due within 14 days.'
      : 'Contract is active. Renewal reminders can be sent before the period ends.'
  }
  if (status === 'expired') {
    return 'Contract period has ended. Renew to start the next billing period.'
  }
  return 'Contract is canceled. Renewal reminders are stopped.'
}

function sortHostingContracts(contracts: HostingContractRecord[]) {
  const statusOrder: Record<HostingContractStatus, number> = {
    active: 0,
    expired: 1,
    canceled: 2,
  }

  return [...contracts].sort((a, b) => {
    const byStatus = statusOrder[a.status] - statusOrder[b.status]
    if (byStatus !== 0) return byStatus
    return a.periodEnd.localeCompare(b.periodEnd)
  })
}

function HostingLifecycleCard({
  contract,
  compact,
}: {
  contract: HostingContractRecord
  compact: boolean
}) {
  const expiringSoon = isExpiringSoon(contract.periodEnd, contract.status)

  return (
    <article
      className={`retainer-lifecycle-panel${compact ? ' client-hosting-lifecycle-card' : ''} anim-fade-up anim-fade-up-4`}
    >
      <div className="retainer-lifecycle-head flex flex-wrap items-start justify-between gap-3">
        <div>
          {compact ? (
            <p className="retainer-panel-title">{contract.name}</p>
          ) : (
            <>
              <p className="retainer-lifecycle-eyebrow">Hosting lifecycle</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <StatusFlag
                  label={HOSTING_CONTRACT_STATUS_LABELS[contract.status]}
                  tone={hostingStatusTone(contract.status)}
                />
                {expiringSoon ? <StatusFlag label="Renewal soon" tone="warn" /> : null}
              </div>
            </>
          )}
          {compact ? (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StatusFlag
                label={HOSTING_CONTRACT_STATUS_LABELS[contract.status]}
                tone={hostingStatusTone(contract.status)}
              />
              {expiringSoon ? <StatusFlag label="Renewal soon" tone="warn" /> : null}
            </div>
          ) : null}
        </div>
        <Link href={`/admin/ops/hosting-maintenance/${contract.id}`} className="dash-link-accent">
          View contract →
        </Link>
      </div>

      <div className={`retainer-panel${compact ? ' mt-3' : ' mt-4'}`}>
        <div className="retainer-panel-head">
          <div className="min-w-0">
            {!compact ? <p className="retainer-panel-title">{contract.name}</p> : null}
            <p className="retainer-panel-period tabular-nums">
              {formatDateRange(contract.periodStart, contract.periodEnd)}
            </p>
          </div>
        </div>
        <div className="retainer-panel-stats">
          <div className="retainer-stat-block">
            <p className="retainer-stat-label">Billing</p>
            <p className="retainer-stat-value">
              {formatHostingContractCost(
                contract.costAmount,
                contract.periodType,
                contract.customPeriod
              )}
            </p>
          </div>
        </div>
      </div>

      <p className="dash-meta leading-relaxed mt-3">
        {hostingStatusMessage(contract.status, expiringSoon)}
      </p>

      <div className="retainer-lifecycle-actions">
        <HostingContractActions
          contractId={contract.id}
          contractName={contract.name}
          status={contract.status}
        />
      </div>
    </article>
  )
}

export function ClientHostingLifecycleSection({
  contracts,
}: {
  contracts: HostingContractRecord[]
}) {
  if (!contracts.length) return null

  const sorted = sortHostingContracts(contracts)
  const multiple = sorted.length > 1

  if (!multiple) {
    return <HostingLifecycleCard contract={sorted[0]} compact={false} />
  }

  return (
    <section className="client-hosting-lifecycle-stack space-y-4 anim-fade-up anim-fade-up-4">
      <div className="client-hosting-lifecycle-stack-head">
        <p className="retainer-lifecycle-eyebrow">Hosting lifecycle</p>
        <p className="dash-meta mt-1">{sorted.length} contracts for this client</p>
      </div>
      {sorted.map(contract => (
        <HostingLifecycleCard key={contract.id} contract={contract} compact />
      ))}
    </section>
  )
}
