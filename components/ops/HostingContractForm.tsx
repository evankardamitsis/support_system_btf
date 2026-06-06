'use client'

import { useRouter } from 'next/navigation'
import { DashCancel } from '@/components/dashboard/DashCancel'
import { useState, useTransition } from 'react'
import {
  createHostingContract,
  updateHostingContract,
} from '@/app/actions/hosting-maintenance'
import {
  HOSTING_PERIOD_OPTIONS,
  isHostingMaintenancePeriod,
  type HostingMaintenancePeriod,
} from '@/lib/ops/financial-offer/types'
import type { HostingContractRecord } from '@/lib/ops/hosting-maintenance/types'
import {
  ClientSelectWithCreate,
  type ClientOption,
} from '@/components/clients/ClientSelectWithCreate'
import { HostingPeriodDates } from '@/components/ops/HostingPeriodDates'
import { notifyError, runWithToast } from '@/lib/notify'
import { isDateOnly, periodEndFromStart, utcToday } from '@/lib/ops/hosting-maintenance/period'

function normalizePeriodType(value: string | undefined): HostingMaintenancePeriod {
  if (isHostingMaintenancePeriod(value)) return value
  return 'year'
}

export function HostingContractForm({
  clients,
  contract,
  initialClientId,
}: {
  clients: ClientOption[]
  contract?: HostingContractRecord
  initialClientId?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const today = utcToday()
  const initialPeriodType = normalizePeriodType(contract?.periodType)
  const initialStart = contract?.periodStart ?? today
  const initialEnd = contract?.periodEnd ?? periodEndFromStart(initialStart, initialPeriodType)

  const [name, setName] = useState(contract?.name ?? '')
  const [clientId, setClientId] = useState(
    contract?.clientId ??
      (initialClientId && clients.some(row => row.id === initialClientId) ? initialClientId : '')
  )
  const [costAmount, setCostAmount] = useState(
    contract?.costAmount != null ? String(contract.costAmount) : ''
  )
  const [periodType, setPeriodType] = useState<HostingMaintenancePeriod>(initialPeriodType)
  const [periodStart, setPeriodStart] = useState(initialStart)
  const [periodEnd, setPeriodEnd] = useState(initialEnd)
  const [endSynced, setEndSynced] = useState(
    !contract || periodEndFromStart(initialStart, initialPeriodType) === initialEnd
  )
  const [notes, setNotes] = useState(contract?.notes ?? '')

  function syncPeriodEnd(start: string, type: HostingMaintenancePeriod) {
    if (!isDateOnly(start)) return
    setPeriodEnd(periodEndFromStart(start, type))
    setEndSynced(true)
  }

  function handlePeriodTypeChange(next: HostingMaintenancePeriod) {
    setPeriodType(next)
    syncPeriodEnd(periodStart, next)
  }

  function handlePeriodStartChange(nextStart: string) {
    setPeriodStart(nextStart)
    if (endSynced) {
      syncPeriodEnd(nextStart, periodType)
    }
  }

  function handlePeriodEndChange(nextEnd: string, synced = false) {
    setPeriodEnd(nextEnd)
    setEndSynced(synced)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cost = Number(costAmount)
    if (!clientId) {
      notifyError('Select a client or create a new one')
      return
    }
    if (!Number.isFinite(cost) || cost < 0) {
      notifyError('Enter a valid cost amount')
      return
    }

    startTransition(async () => {
      const payload = {
        name,
        clientId,
        costAmount: cost,
        periodType,
        customPeriod: null,
        periodStart,
        periodEnd,
        notes,
      }

      if (contract) {
        const ok = await runWithToast(() => updateHostingContract(contract.id, payload), {
          loading: 'Saving…',
          success: 'Contract updated',
        })
        if (ok === null) return
        router.refresh()
        return
      }

      const ok = await runWithToast(() => createHostingContract(payload), {
        loading: 'Creating…',
        success: 'Contract created',
      })
      if (ok === null) return
      router.push('/admin/ops/hosting-maintenance')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full max-w-2xl">
      <div>
        <label className="dash-label" htmlFor="hosting-name">
          Name
        </label>
        <input
          id="hosting-name"
          className="btf-input w-full"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Client website hosting"
          disabled={pending}
          required
        />
      </div>

      <ClientSelectWithCreate
        clients={clients}
        value={clientId}
        onChange={setClientId}
        disabled={pending}
        selectId="hosting-client"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <label className="dash-label" htmlFor="hosting-cost">
            Cost (EUR)
          </label>
          <input
            id="hosting-cost"
            type="number"
            min={0}
            step={0.01}
            className="btf-input w-full tabular-nums"
            value={costAmount}
            onChange={e => setCostAmount(e.target.value)}
            disabled={pending}
            required
          />
        </div>
        <div>
          <label className="dash-label" htmlFor="hosting-period-type">
            Period
          </label>
          <select
            id="hosting-period-type"
            className="btf-input w-full"
            value={periodType}
            onChange={e => handlePeriodTypeChange(e.target.value as HostingMaintenancePeriod)}
            disabled={pending}
          >
            {HOSTING_PERIOD_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <HostingPeriodDates
        periodType={periodType}
        periodStart={periodStart}
        periodEnd={periodEnd}
        onPeriodStartChange={handlePeriodStartChange}
        onPeriodEndChange={handlePeriodEndChange}
        onSyncPeriodEnd={() => syncPeriodEnd(periodStart, periodType)}
        endSynced={endSynced}
        disabled={pending}
      />

      <div>
        <label className="dash-label" htmlFor="hosting-notes">
          Notes <span className="dash-meta">(optional)</span>
        </label>
        <textarea
          id="hosting-notes"
          className="btf-input w-full min-h-20"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={pending}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="dash-btn-primary btn-primary" disabled={pending}>
          {contract ? 'Save changes' : 'Create contract'}
        </button>
        <DashCancel href="/admin/ops/hosting-maintenance" />
      </div>
    </form>
  )
}
