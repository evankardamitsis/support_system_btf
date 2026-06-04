'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRetainerPeriod } from '@/app/actions/retainers'
import { PACKAGE_LABELS, RETAINER_PACKAGES, type RetainerPackage } from '@/lib/retainers/packages'

export function RetainerPeriodForm({
  clientId,
  billingCycleDay = 1,
  submitLabel = 'Save retainer',
  showCustomDates = false,
}: {
  clientId: string
  billingCycleDay?: number
  submitLabel?: string
  showCustomDates?: boolean
}) {
  const router = useRouter()
  const [packageName, setPackageName] = useState<RetainerPackage>('care')
  const [customDates, setCustomDates] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const formData = new FormData(e.currentTarget)
    formData.set('client_id', clientId)
    formData.set('package_name', packageName)
    formData.set('billing_cycle_day', String(billingCycleDay))
    formData.set('use_custom_dates', customDates ? 'true' : 'false')

    try {
      await createRetainerPeriod(formData)
      router.refresh()
      e.currentTarget.reset()
      setPackageName('care')
      setCustomDates(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save retainer')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="retainer-form space-y-4">
      <div>
        <p className="dash-label">Package</p>
        <div className="retainer-package-picker" role="group" aria-label="Retainer package">
          {RETAINER_PACKAGES.map(pkg => (
            <button
              key={pkg}
              type="button"
              className={`retainer-package-option ${packageName === pkg ? 'is-active' : ''}`}
              data-package={pkg}
              onClick={() => setPackageName(pkg)}
              disabled={pending}
            >
              {PACKAGE_LABELS[pkg]}
            </button>
          ))}
        </div>
        <p className="dash-meta mt-2 leading-relaxed">
          Care and Grow are package names — set hours and contract value per client.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="dash-label" htmlFor={`hours-${clientId}`}>
            Monthly hours <span className="dash-label-required">*</span>
          </label>
          <input
            id={`hours-${clientId}`}
            name="hours_total"
            type="number"
            step="0.5"
            min="0.5"
            required
            className="btf-input w-full tabular-nums"
            placeholder="e.g. 20"
            disabled={pending}
          />
        </div>
        <div>
          <label className="dash-label" htmlFor={`cost-${clientId}`}>
            Period cost <span className="dash-label-required">*</span>
          </label>
          <input
            id={`cost-${clientId}`}
            name="period_cost"
            type="number"
            step="1"
            min="0"
            required
            className="btf-input w-full tabular-nums"
            placeholder="e.g. 1200"
            disabled={pending}
          />
          <p className="dash-meta mt-1">Internal — not shown to clients</p>
        </div>
      </div>

      {showCustomDates ? (
        <>
          <label className="retainer-custom-dates flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={customDates}
              onChange={e => setCustomDates(e.target.checked)}
              disabled={pending}
            />
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>
              Custom period dates (otherwise uses billing cycle)
            </span>
          </label>
          {customDates ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="dash-label">Start</label>
                <input
                  name="period_start"
                  type="date"
                  defaultValue={today}
                  className="btf-input w-full"
                  disabled={pending}
                />
              </div>
              <div>
                <label className="dash-label">End</label>
                <input
                  name="period_end"
                  type="date"
                  defaultValue={nextMonth}
                  className="btf-input w-full"
                  disabled={pending}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="dash-meta">
          Billing period follows this client&apos;s monthly cycle (day {billingCycleDay}).
        </p>
      )}

      {error ? <p className="ticket-modal-error">{error}</p> : null}

      <button
        type="submit"
        className="dash-btn-primary btn-primary cursor-pointer"
        disabled={pending}
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
