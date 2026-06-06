'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import {
  cancelHostingContract,
  renewHostingContract,
  sendHostingContractRenewalReminder,
} from '@/app/actions/hosting-maintenance'
import {
  daysUntilExpiry,
  formatHostingContractCost,
  formatHostingDate,
  isExpiringSoon,
} from '@/lib/ops/hosting-maintenance/display'
import {
  HOSTING_CONTRACT_STATUS_LABELS,
  HOSTING_RENEWAL_REMINDER_DAYS,
  type HostingContractRecord,
  type HostingContractStatus,
} from '@/lib/ops/hosting-maintenance/types'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { runWithToast } from '@/lib/notify'

type Filter = 'all' | 'active' | 'expiring' | 'expired' | 'canceled'

const FILTERS: Filter[] = ['all', 'active', 'expiring', 'expired', 'canceled']

export function HostingContractsList({ contracts }: { contracts: HostingContractRecord[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState<Filter>('all')
  const [cancelContract, setCancelContract] = useState<HostingContractRecord | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return contracts
    if (filter === 'expiring') {
      return contracts.filter(c => isExpiringSoon(c.periodEnd, c.status))
    }
    return contracts.filter(c => c.status === filter)
  }, [contracts, filter])

  function handleRenew(id: string) {
    startTransition(async () => {
      const ok = await runWithToast(() => renewHostingContract(id), {
        loading: 'Renewing…',
        success: 'Contract renewed for next period',
      })
      if (ok === null) return
      router.refresh()
    })
  }

  function handleReminder(id: string) {
    startTransition(async () => {
      const ok = await runWithToast(() => sendHostingContractRenewalReminder(id), {
        loading: 'Sending reminder…',
        success: 'Renewal reminder sent',
      })
      if (ok === null) return
      router.refresh()
    })
  }

  function handleCancelConfirm() {
    if (!cancelContract) return
    startTransition(async () => {
      const ok = await runWithToast(() => cancelHostingContract(cancelContract.id), {
        loading: 'Canceling…',
        success: 'Contract canceled',
      })
      if (ok === null) return
      setCancelContract(null)
      router.refresh()
    })
  }

  if (contracts.length === 0) {
    return (
      <div className="dash-empty">
        <p className="dash-empty-title">No hosting contracts yet</p>
        <p className="dash-empty-hint">
          Add a contract to track renewal dates and send payment reminders.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="ops-projects-filters" role="tablist" aria-label="Filter contracts">
        {FILTERS.map(value => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            className={`ops-projects-filter${filter === value ? ' ops-projects-filter--active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {value === 'all'
              ? 'All'
              : value === 'expiring'
                ? `Expiring (${HOSTING_RENEWAL_REMINDER_DAYS}d)`
                : HOSTING_CONTRACT_STATUS_LABELS[value as HostingContractStatus]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty-title">No contracts match this filter</p>
        </div>
      ) : (
        <div className="ops-hosting-table">
          <div className="ops-hosting-grid ops-hosting-grid-head">
            <span>Name</span>
            <span>Client</span>
            <span>Cost</span>
            <span>Period</span>
            <span>Expires</span>
            <span>Status</span>
            <span />
          </div>
          <div>
            {filtered.map(contract => {
              const days = daysUntilExpiry(contract.periodEnd)
              const expiring = isExpiringSoon(contract.periodEnd, contract.status)
              return (
                <div key={contract.id} className={`ops-hosting-grid ops-hosting-row${expiring ? ' ops-hosting-row--expiring' : ''}`}>
                  <div className="ops-hosting-cell min-w-0" data-label="Name">
                    <Link
                      href={`/admin/ops/hosting-maintenance/${contract.id}`}
                      className="ops-hosting-name"
                    >
                      {contract.name}
                    </Link>
                  </div>
                  <div className="ops-hosting-cell" data-label="Client">
                    {contract.clientName}
                  </div>
                  <div className="ops-hosting-cell tabular-nums" data-label="Cost">
                    {formatHostingContractCost(
                      contract.costAmount,
                      contract.periodType,
                      contract.customPeriod
                    )}
                  </div>
                  <div className="ops-hosting-cell tabular-nums" data-label="Period">
                    <time dateTime={contract.periodStart}>{formatHostingDate(contract.periodStart)}</time>
                    <span className="dash-meta mx-1">→</span>
                    <time dateTime={contract.periodEnd}>{formatHostingDate(contract.periodEnd)}</time>
                  </div>
                  <div className="ops-hosting-cell" data-label="Expires">
                    <span className={expiring ? 'ops-hosting-expiry--soon' : days < 0 ? 'ops-hosting-expiry--past' : ''}>
                      {formatHostingDate(contract.periodEnd)}
                    </span>
                    {contract.status === 'active' ? (
                      <span className="dash-meta ml-2">
                        {days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}
                      </span>
                    ) : null}
                  </div>
                  <div className="ops-hosting-cell" data-label="Status">
                    <span className={`ops-hosting-status ops-hosting-status--${contract.status}`}>
                      {HOSTING_CONTRACT_STATUS_LABELS[contract.status]}
                    </span>
                    {contract.renewalNotifiedAt ? (
                      <span className="dash-meta block mt-0.5">Reminded</span>
                    ) : null}
                  </div>
                  <div className="ops-hosting-cell ops-hosting-actions" data-label="Actions">
                    {contract.status === 'active' ? (
                      <div className="ops-hosting-actions-main">
                        <button
                          type="button"
                          className={`ops-hosting-action${
                            expiring ? ' ops-hosting-action--primary' : ' ops-hosting-action--secondary'
                          }`}
                          disabled={pending}
                          onClick={() => handleReminder(contract.id)}
                        >
                          Remind
                        </button>
                        <button
                          type="button"
                          className={`ops-hosting-action${
                            expiring ? ' ops-hosting-action--secondary' : ' ops-hosting-action--primary'
                          }`}
                          disabled={pending}
                          onClick={() => handleRenew(contract.id)}
                        >
                          Renew
                        </button>
                      </div>
                    ) : null}
                    {contract.status !== 'canceled' ? (
                      <button
                        type="button"
                        className={`ops-hosting-action ops-hosting-action--danger${
                          contract.status !== 'active' ? ' ops-hosting-action--solo' : ''
                        }`}
                        disabled={pending}
                        onClick={() => setCancelContract(contract)}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={cancelContract !== null}
        onClose={() => {
          if (pending) return
          setCancelContract(null)
        }}
        title="Cancel hosting contract?"
        description={
          cancelContract ? (
            <>
              <strong>{cancelContract.name}</strong> for {cancelContract.clientName} will be marked
              canceled. Renewal reminders will stop for this contract.
            </>
          ) : null
        }
        confirmLabel="Cancel contract"
        confirmVariant="danger"
        pendingLabel="Canceling…"
        pending={pending}
        onConfirm={handleCancelConfirm}
      />
    </div>
  )
}
