'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateClientAction } from '@/app/actions/clients'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { runWithToast } from '@/lib/notify'

export type ClientEditFields = {
  id: string
  name: string
  email: string
  contact_name: string | null
  billing_cycle_day: number
  sla_response_hours: number
}

export function EditClientForm({ client }: { client: ClientEditFields }) {
  const router = useRouter()
  const [name, setName] = useState(client.name)
  const [contactName, setContactName] = useState(client.contact_name ?? '')
  const [email, setEmail] = useState(client.email)
  const [billingCycleDay, setBillingCycleDay] = useState(String(client.billing_cycle_day ?? 1))
  const [slaResponseHours, setSlaResponseHours] = useState(String(client.sla_response_hours ?? 8))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setName(client.name)
    setContactName(client.contact_name ?? '')
    setEmail(client.email)
    setBillingCycleDay(String(client.billing_cycle_day ?? 1))
    setSlaResponseHours(String(client.sla_response_hours ?? 8))
  }, [client])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData()
    formData.set('name', name)
    formData.set('contact_name', contactName)
    formData.set('email', email)
    formData.set('billing_cycle_day', billingCycleDay)
    formData.set('sla_response_hours', slaResponseHours)

    const ok = await runWithToast(() => updateClientAction(client.id, formData), {
      loading: 'Saving client…',
      success: 'Client updated',
    })
    setPending(false)
    if (ok === null) {
      setError('Could not save client')
      return
    }
    setError(null)
    router.refresh()
  }

  return (
    <FormPanel title="Client details">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="dash-label" htmlFor={`client-name-${client.id}`}>
            Company name <span className="dash-label-required">*</span>
          </label>
          <input
            id={`client-name-${client.id}`}
            name="name"
            required
            value={name}
            onChange={event => setName(event.target.value)}
            className="btf-input w-full"
            placeholder="Acropolis Studios"
            disabled={pending}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="dash-label" htmlFor={`client-contact-${client.id}`}>
              Contact name
            </label>
            <input
              id={`client-contact-${client.id}`}
              name="contact_name"
              value={contactName}
              onChange={event => setContactName(event.target.value)}
              className="btf-input w-full"
              placeholder="Nikos Papadopoulos"
              disabled={pending}
            />
          </div>
          <div>
            <label className="dash-label" htmlFor={`client-email-${client.id}`}>
              Email <span className="dash-label-required">*</span>
            </label>
            <input
              id={`client-email-${client.id}`}
              name="email"
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="btf-input w-full"
              placeholder="hello@studio.gr"
              disabled={pending}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="dash-label" htmlFor={`client-billing-day-${client.id}`}>
              Billing cycle day
            </label>
            <input
              id={`client-billing-day-${client.id}`}
              name="billing_cycle_day"
              type="number"
              min={1}
              max={28}
              value={billingCycleDay}
              onChange={event => setBillingCycleDay(event.target.value)}
              className="btf-input w-full tabular-nums"
              disabled={pending}
            />
            <p className="dash-meta mt-1">Day of month retainer periods renew (1–28)</p>
          </div>
          <div>
            <label className="dash-label" htmlFor={`client-sla-${client.id}`}>
              SLA response (hours)
            </label>
            <input
              id={`client-sla-${client.id}`}
              name="sla_response_hours"
              type="number"
              min={1}
              value={slaResponseHours}
              onChange={event => setSlaResponseHours(event.target.value)}
              className="btf-input w-full tabular-nums"
              disabled={pending}
            />
          </div>
        </div>

        {error ? <p className="ticket-modal-error">{error}</p> : null}

        <div>
          <button type="submit" className="dash-btn-primary btn-primary cursor-pointer" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </FormPanel>
  )
}
