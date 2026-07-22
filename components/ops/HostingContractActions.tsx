'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  cancelHostingContract,
  renewHostingContract,
  sendHostingContractRenewalReminder,
} from '@/app/actions/hosting-maintenance'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import type { HostingContractStatus } from '@/lib/ops/hosting-maintenance/types'
import { runWithToast } from '@/lib/notify'

export function HostingContractActions({
  contractId,
  contractName,
  status,
}: {
  contractId: string
  contractName: string
  status: HostingContractStatus
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmCancel, setConfirmCancel] = useState(false)

  if (status === 'canceled') return null

  function handleRenew() {
    startTransition(async () => {
      const ok = await runWithToast(() => renewHostingContract(contractId), {
        loading: 'Renewing…',
        success: 'Contract renewed for next period',
      })
      if (ok === null) return
      router.refresh()
    })
  }

  function handleReminder() {
    startTransition(async () => {
      const ok = await runWithToast(() => sendHostingContractRenewalReminder(contractId), {
        loading: 'Sending reminder…',
        success: 'Renewal reminder sent',
      })
      if (ok === null) return
      router.refresh()
    })
  }

  function handleCancelConfirm() {
    startTransition(async () => {
      const ok = await runWithToast(() => cancelHostingContract(contractId), {
        loading: 'Canceling…',
        success: 'Contract canceled',
      })
      if (ok === null) return
      setConfirmCancel(false)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 shrink-0">
        {status === 'active' ? (
          <button
            type="button"
            className="dash-btn-primary btn-primary"
            disabled={pending}
            onClick={handleReminder}
          >
            Send renewal reminder
          </button>
        ) : null}
        <button
          type="button"
          className={status === 'expired' ? 'dash-btn-primary btn-primary' : 'dash-btn-ghost'}
          disabled={pending}
          onClick={handleRenew}
        >
          Renew period
        </button>
        <button
          type="button"
          className="dash-btn-ghost"
          disabled={pending}
          onClick={() => setConfirmCancel(true)}
        >
          Cancel contract
        </button>
      </div>

      <ConfirmDeleteModal
        open={confirmCancel}
        onClose={() => {
          if (pending) return
          setConfirmCancel(false)
        }}
        title="Cancel hosting contract?"
        description={
          <>
            <strong>{contractName}</strong> will be marked canceled. Renewal reminders will stop
            for this contract.
          </>
        }
        confirmLabel="Cancel contract"
        confirmVariant="danger"
        pendingLabel="Canceling…"
        pending={pending}
        onConfirm={handleCancelConfirm}
      />
    </>
  )
}
