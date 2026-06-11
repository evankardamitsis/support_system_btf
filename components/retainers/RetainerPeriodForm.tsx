'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRetainerPeriod } from '@/app/actions/retainers'
import { DateInput } from '@/components/ui/DateInput'
import { PACKAGE_LABELS, RETAINER_PACKAGES, type RetainerPackage } from '@/lib/retainers/packages'
import { isHoursBasedPackage } from '@/lib/retainers/billing-model'
import { DashCancel } from '@/components/dashboard/DashCancel'
import { runWithToast } from '@/lib/notify'

function defaultPeriodDates() {
  const start = new Date()
  const end = new Date(start)
  end.setDate(end.getDate() + 30)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function RetainerPeriodForm({
  clientId,
  billingCycleDay = 1,
  submitLabel = 'Save retainer',
  showCustomDates = false,
  successRedirect,
  cancelHref,
}: {
  clientId: string
  billingCycleDay?: number
  submitLabel?: string
  showCustomDates?: boolean
  successRedirect?: string
  cancelHref?: string
}) {
  const router = useRouter()
  const [packageName, setPackageName] = useState<RetainerPackage>('care')
  const [customDates, setCustomDates] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [periodStart, setPeriodStart] = useState(() => defaultPeriodDates().start)
  const [periodEnd, setPeriodEnd] = useState(() => defaultPeriodDates().end)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setError(null)
    setPending(true)
    const formData = new FormData(form)
    formData.set('client_id', clientId)
    formData.set('package_name', packageName)
    formData.set('billing_cycle_day', String(billingCycleDay))
    formData.set('use_custom_dates', customDates ? 'true' : 'false')
    if (customDates) {
      formData.set('period_start', periodStart)
      formData.set('period_end', periodEnd)
    }

    const ok = await runWithToast(() => createRetainerPeriod(formData), {
      loading: 'Saving retainer…',
      success: 'Retainer period saved',
    })
    setPending(false)
    if (ok === null) {
      setError('Could not save retainer')
      return
    }
    setError(null)
    if (successRedirect) {
      router.push(successRedirect)
      router.refresh()
      return
    }
    setPackageName('care')
    setCustomDates(false)
    const defaults = defaultPeriodDates()
    setPeriodStart(defaults.start)
    setPeriodEnd(defaults.end)
    form.reset()
    router.refresh()
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
          {isHoursBasedPackage(packageName)
            ? 'Care and Grow include monthly hours — set hours and contract value per client.'
            : 'Fixed is a flat monthly fee with unlimited requests — no hour tracking.'}
        </p>
      </div>

      <div className={`grid gap-4 ${isHoursBasedPackage(packageName) ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {isHoursBasedPackage(packageName) ? (
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
        ) : (
          <input type="hidden" name="hours_total" value="0" />
        )}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="dash-label" htmlFor={`period-start-${clientId}`}>
                  Start
                </label>
                <DateInput
                  id={`period-start-${clientId}`}
                  value={periodStart}
                  onChange={setPeriodStart}
                  disabled={pending}
                  required
                />
              </div>
              <div>
                <label className="dash-label" htmlFor={`period-end-${clientId}`}>
                  End
                </label>
                <DateInput
                  id={`period-end-${clientId}`}
                  value={periodEnd}
                  onChange={setPeriodEnd}
                  min={periodStart}
                  disabled={pending}
                  required
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

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="submit"
          className="dash-btn-primary btn-primary cursor-pointer"
          disabled={pending}
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
        {cancelHref ? <DashCancel href={cancelHref} /> : null}
      </div>
    </form>
  )
}
