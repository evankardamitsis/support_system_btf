'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ClientSelectWithCreate, type ClientOption } from '@/components/clients/ClientSelectWithCreate'
import { RetainerPeriodForm } from '@/components/retainers/RetainerPeriodForm'
import {
  RETAINER_STATUS_LABELS,
  type RetainerLifecycleStatus,
  retainerStatusMessage,
} from '@/lib/retainers/status'

export type RetainerClientOption = ClientOption & {
  billing_cycle_day: number | null
  retainer_status: RetainerLifecycleStatus | null
}

export function AdminNewRetainerForm({
  clients,
  defaultClientId,
}: {
  clients: RetainerClientOption[]
  defaultClientId?: string
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? '')

  const clientOptions = useMemo(
    () => clients.map(client => ({ id: client.id, name: client.name })),
    [clients]
  )

  const selected = useMemo(
    () => clients.find(client => client.id === clientId) ?? null,
    [clientId, clients]
  )

  const lifecycleBlocked =
    selected?.retainer_status === 'frozen' || selected?.retainer_status === 'canceled'

  return (
    <div className="space-y-4">
      <ClientSelectWithCreate
        clients={clientOptions}
        value={clientId}
        onChange={setClientId}
        selectId="retainer-client"
        label="Client"
        placeholder="Select client…"
        required
      />

      {!clientId ? (
        <p className="dash-meta leading-relaxed">
          Choose a client to set up Care, Grow, or Fixed package hours and billing for a new period.
        </p>
      ) : null}

      {selected && lifecycleBlocked ? (
        <div className="retainer-lifecycle-banner" data-tone="blocked">
          <p className="retainer-lifecycle-banner-title">
            {RETAINER_STATUS_LABELS[selected.retainer_status ?? 'active']}
          </p>
          <p className="dash-meta leading-relaxed mt-2">
            {retainerStatusMessage(selected.retainer_status ?? 'active')}{' '}
            <Link href={`/admin/clients/${selected.id}`} className="dash-link-accent">
              Manage on client page →
            </Link>
          </p>
        </div>
      ) : null}

      {selected && !lifecycleBlocked ? (
        <RetainerPeriodForm
          key={selected.id}
          clientId={selected.id}
          billingCycleDay={selected.billing_cycle_day ?? 1}
          submitLabel="Create retainer period"
          showCustomDates
        />
      ) : null}
    </div>
  )
}
