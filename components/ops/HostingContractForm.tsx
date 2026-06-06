'use client'

import { useRouter } from 'next/navigation'
import { DashCancel } from '@/components/dashboard/DashCancel'
import { useState, useTransition } from 'react'
import {
  createHostingContract,
  updateHostingContract,
} from '@/app/actions/hosting-maintenance'
import type { HostingMaintenancePeriod } from '@/lib/ops/financial-offer/types'
import type { HostingContractRecord } from '@/lib/ops/hosting-maintenance/types'
import {
  ClientSelectWithCreate,
  type ClientOption,
} from '@/components/clients/ClientSelectWithCreate'
import { HostingPeriodDates } from '@/components/ops/HostingPeriodDates'
import { notifyError, runWithToast } from '@/lib/notify'
import {
  inclusivePeriodDays,
  isDateOnly,
  periodEndFromStart,
  utcToday,
} from '@/lib/ops/hosting-maintenance/period'

export function HostingContractForm({
  clients,
  contract,
}: {
  clients: ClientOption[]
  contract?: HostingContractRecord
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const today = utcToday()
  const initialPeriodType = contract?.periodType ?? 'year'
  const initialStart = contract?.periodStart ?? today
  const initialEnd =
    contract?.periodEnd ?? periodEndFromStart(initialStart, initialPeriodType)

  const [name, setName] = useState(contract?.name ?? '')
  const [clientId, setClientId] = useState(contract?.clientId ?? '')
  const [costAmount, setCostAmount] = useState(
    contract?.costAmount != null ? String(contract.costAmount) : ''
  )
  const [periodType, setPeriodType] = useState<HostingMaintenancePeriod>(initialPeriodType)
  const [customPeriod, setCustomPeriod] = useState(contract?.customPeriod ?? '')
  const [periodStart, setPeriodStart] = useState(initialStart)
  const [periodEnd, setPeriodEnd] = useState(initialEnd)
  const [customDurationDays, setCustomDurationDays] = useState(
    contract
      ? inclusivePeriodDays(contract.periodStart, contract.periodEnd)
      : 365
  )
  const [endSynced, setEndSynced] = useState(
    !contract || periodEndFromStart(initialStart, initialPeriodType, customDurationDays) === initialEnd
  )
  const [notes, setNotes] = useState(contract?.notes ?? '')

  function syncPeriodEnd(
    start: string,
    type: HostingMaintenancePeriod,
    durationDays = customDurationDays
  ) {
    if (!isDateOnly(start)) return
    setPeriodEnd(periodEndFromStart(start, type, durationDays))
    setEndSynced(true)
  }

  function handlePeriodTypeChange(next: HostingMaintenancePeriod) {
    setPeriodType(next)
    if (next !== 'custom') {
      syncPeriodEnd(periodStart, next)
    }
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
    if (periodType === 'custom' && isDateOnly(periodStart) && isDateOnly(nextEnd) && nextEnd >= periodStart) {
      setCustomDurationDays(inclusivePeriodDays(periodStart, nextEnd))
    }
  }

  function handleCustomDurationDaysChange(days: number) {
    setCustomDurationDays(days)
    setEndSynced(true)
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
        customPeriod: periodType === 'custom' ? customPeriod : null,
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <option value="year">Per year</option>
            <option value="month">Per month</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {periodType === 'custom' ? (
          <div>
            <label className="dash-label" htmlFor="hosting-custom-period">
              Custom period
            </label>
            <input
              id="hosting-custom-period"
              className="btf-input w-full"
              value={customPeriod}
              onChange={e => setCustomPeriod(e.target.value)}
              placeholder="e.g. per quarter"
              disabled={pending}
              required
            />
          </div>
        ) : null}
      </div>

      <HostingPeriodDates
        periodType={periodType}
        periodStart={periodStart}
        periodEnd={periodEnd}
        onPeriodStartChange={handlePeriodStartChange}
        onPeriodEndChange={handlePeriodEndChange}
        onSyncPeriodEnd={() => syncPeriodEnd(periodStart, periodType)}
        endSynced={endSynced}
        customDurationDays={customDurationDays}
        onCustomDurationDaysChange={handleCustomDurationDaysChange}
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
