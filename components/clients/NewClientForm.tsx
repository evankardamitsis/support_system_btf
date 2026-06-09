'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientAction } from '@/app/actions/clients'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { DashCancel } from '@/components/dashboard/DashCancel'
import { DateInput } from '@/components/ui/DateInput'
import { PACKAGE_LABELS, RETAINER_PACKAGES, type RetainerPackage } from '@/lib/retainers/packages'
import { isHoursBasedPackage } from '@/lib/retainers/billing-model'
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

export function NewClientForm() {
  const router = useRouter()
  const [packageName, setPackageName] = useState<RetainerPackage>('care')
  const [customDates, setCustomDates] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [periodStart, setPeriodStart] = useState(() => defaultPeriodDates().start)
  const [periodEnd, setPeriodEnd] = useState(() => defaultPeriodDates().end)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const formData = new FormData(e.currentTarget)
    formData.set('package_name', packageName)
    formData.set('use_custom_dates', customDates ? 'true' : 'false')
    if (customDates) {
      formData.set('period_start', periodStart)
      formData.set('period_end', periodEnd)
    }

    const id = await runWithToast(() => createClientAction(formData), {
      loading: 'Creating client…',
      success: 'Client created',
    })
    setPending(false)
    if (!id) {
      setError('Could not create client')
      return
    }
    router.push(`/admin/clients/${id}`)
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Link href="/admin/clients" className="dash-back">
        ← Back to clients
      </Link>

      <PageHeader
        title="New client"
        description="Add a client with a Care, Grow, or Fixed retainer — hours and contract value are per client."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormPanel title="Client details">
          <div className="flex flex-col gap-4">
            <div>
              <label className="dash-label">
                Company name <span className="dash-label-required">*</span>
              </label>
              <input
                name="name"
                required
                className="btf-input w-full"
                placeholder="Acropolis Studios"
                disabled={pending}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="dash-label">Contact name</label>
                <input
                  name="contact_name"
                  className="btf-input w-full"
                  placeholder="Nikos Papadopoulos"
                  disabled={pending}
                />
              </div>
              <div>
                <label className="dash-label">
                  Email <span className="dash-label-required">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="btf-input w-full"
                  placeholder="hello@studio.gr"
                  disabled={pending}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="dash-label">Billing cycle day</label>
                <input
                  name="billing_cycle_day"
                  type="number"
                  min={1}
                  max={28}
                  defaultValue={1}
                  className="btf-input w-full tabular-nums"
                  disabled={pending}
                />
              </div>
              <div>
                <label className="dash-label">SLA response (hours)</label>
                <input
                  name="sla_response_hours"
                  type="number"
                  defaultValue={8}
                  min={1}
                  className="btf-input w-full"
                  disabled={pending}
                />
              </div>
            </div>
          </div>
        </FormPanel>

        <FormPanel title="Retainer">
          <div className="flex flex-col gap-4">
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
            </div>

            <div className={`grid gap-4 ${isHoursBasedPackage(packageName) ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {isHoursBasedPackage(packageName) ? (
                <div>
                  <label className="dash-label">
                    Monthly hours <span className="dash-label-required">*</span>
                  </label>
                  <input
                    name="hours_total"
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    placeholder="e.g. 20"
                    className="btf-input w-full tabular-nums"
                    disabled={pending}
                  />
                </div>
              ) : (
                <input type="hidden" name="hours_total" value="0" />
              )}
              <div>
                <label className="dash-label">
                  Period cost <span className="dash-label-required">*</span>
                </label>
                <input
                  name="period_cost"
                  type="number"
                  step="1"
                  min="0"
                  required
                  placeholder="e.g. 1200"
                  className="btf-input w-full tabular-nums"
                  disabled={pending}
                />
                <p className="dash-meta mt-1">Internal — not shown to clients</p>
              </div>
            </div>

            <label className="retainer-custom-dates flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={customDates}
                onChange={e => setCustomDates(e.target.checked)}
                disabled={pending}
              />
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                Custom first period dates
              </span>
            </label>

            {customDates ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="dash-label" htmlFor="new-client-period-start">
                    Start
                  </label>
                  <DateInput
                    id="new-client-period-start"
                    value={periodStart}
                    onChange={setPeriodStart}
                    disabled={pending}
                    required
                  />
                </div>
                <div>
                  <label className="dash-label" htmlFor="new-client-period-end">
                    End
                  </label>
                  <DateInput
                    id="new-client-period-end"
                    value={periodEnd}
                    onChange={setPeriodEnd}
                    min={periodStart}
                    disabled={pending}
                    required
                  />
                </div>
              </div>
            ) : (
              <p className="dash-meta">First period uses the billing cycle day above.</p>
            )}
          </div>
        </FormPanel>

        {error ? <p className="ticket-modal-error">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="dash-btn-primary btn-primary cursor-pointer" disabled={pending}>
            {pending ? 'Creating…' : 'Create client'}
          </button>
          <DashCancel href="/admin/clients" />
        </div>
      </form>
    </div>
  )
}
