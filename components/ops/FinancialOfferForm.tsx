'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { submitFinancialOffer, updateFinancialOffer } from '@/app/actions/financial-offers'
import {
  ClientSelectWithCreate,
  type ClientOption,
} from '@/components/clients/ClientSelectWithCreate'
import {
  computeFinancialOffer,
  formatHostingMaintenance,
  formatOfferCurrency,
  offerFilename,
  parseHostingAmountFromMaintenance,
  parseHostingPeriodFromMaintenance,
} from '@/lib/ops/financial-offer/calculate'
import type {
  FinancialOfferLineItem,
  FinancialOfferRecord,
  HostingMaintenancePeriod,
  SavedCompanyIban,
} from '@/lib/ops/financial-offer/types'
import { HOSTING_PERIOD_OPTIONS } from '@/lib/ops/financial-offer/types'
import { isValidEmailAddress, normalizeEmailAddress } from '@/lib/email/addresses'
import { notifyError, runWithToast } from '@/lib/notify'

const emptyLine = (): FinancialOfferLineItem => ({ work: '', cost: 0 })

async function downloadOfferPdf(offerId: string, filename: string) {
  const response = await fetch(`/api/ops/financial-offers/${offerId}/pdf`)
  if (!response.ok) throw new Error('Could not download the offer PDF')

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

type OfferClientOption = ClientOption & { email: string | null }

type FinancialOfferFormProps = {
  savedIbans: SavedCompanyIban[]
  upfrontPercent: number
  clients: OfferClientOption[]
  initialClientId?: string
  offer?: FinancialOfferRecord
}

function initialOfferClient(clients: OfferClientOption[], initialClientId?: string) {
  const client = initialClientId ? clients.find(row => row.id === initialClientId) : undefined
  return {
    clientId: client?.id ?? '',
    clientName: client?.name ?? '',
    clientEmail: client?.email ?? '',
  }
}

function matchSavedIbanIds(savedIbans: SavedCompanyIban[], offerIbans: FinancialOfferRecord['ibans']) {
  const matched = savedIbans
    .filter(saved =>
      offerIbans.some(
        offerIban =>
          offerIban.iban.replace(/\s+/g, '').toLowerCase() ===
            saved.iban.replace(/\s+/g, '').toLowerCase() &&
          offerIban.swiftBic.replace(/\s+/g, '').toLowerCase() ===
            saved.swiftBic.replace(/\s+/g, '').toLowerCase()
      )
    )
    .map(row => row.id)

  if (matched.length > 0) return new Set(matched)
  return new Set(savedIbans.map(row => row.id))
}

export function FinancialOfferForm({
  savedIbans,
  upfrontPercent,
  clients,
  initialClientId,
  offer,
}: FinancialOfferFormProps) {
  const router = useRouter()
  const isEditing = Boolean(offer)
  const initialClient = offer
    ? {
        clientId: offer.clientId ?? '',
        clientName: offer.clientName,
        clientEmail: offer.clientEmail ?? '',
      }
    : initialOfferClient(clients, initialClientId)

  const [clientId, setClientId] = useState(initialClient.clientId)
  const [clientName, setClientName] = useState(initialClient.clientName)
  const [clientEmail, setClientEmail] = useState(initialClient.clientEmail)
  const [lineItems, setLineItems] = useState<FinancialOfferLineItem[]>(() =>
    offer?.lineItems.length
      ? offer.lineItems.map(row => ({ work: row.work, cost: row.cost }))
      : [
          { work: '', cost: 0 },
          { work: '', cost: 0 },
        ]
  )
  const [hostingAmount, setHostingAmount] = useState<number | ''>(() => {
    if (!offer) return ''
    return parseHostingAmountFromMaintenance(offer.hostingMaintenance) ?? ''
  })
  const [hostingPeriod, setHostingPeriod] = useState<HostingMaintenancePeriod>(() =>
    offer ? parseHostingPeriodFromMaintenance(offer.hostingMaintenance) : 'year'
  )
  const [excludeVat, setExcludeVat] = useState(offer?.excludeVat ?? false)
  const [selectedIbanIds, setSelectedIbanIds] = useState<Set<string>>(() =>
    offer ? matchSavedIbanIds(savedIbans, offer.ibans) : new Set(savedIbans.map(row => row.id))
  )
  const [pending, startTransition] = useTransition()

  const filledLineItems = useMemo(
    () => lineItems.filter(row => row.work.trim() && Number(row.cost) > 0),
    [lineItems]
  )

  const totals = useMemo(
    () =>
      computeFinancialOffer({
        lineItems: filledLineItems.length > 0 ? filledLineItems : [{ work: '—', cost: 0 }],
        upfrontPercent,
      }),
    [filledLineItems, upfrontPercent]
  )

  const selectedIbans = useMemo(
    () => savedIbans.filter(row => selectedIbanIds.has(row.id)),
    [savedIbans, selectedIbanIds]
  )

  function updateLine(index: number, patch: Partial<FinancialOfferLineItem>) {
    setLineItems(rows => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function toggleIban(id: string) {
    setSelectedIbanIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size <= 1) return prev
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function buildPayload() {
    const name = clientName.trim()
    if (!name) {
      notifyError('Enter the client name')
      return null
    }

    let hostingMaintenance: string | null = null
    if (hostingAmount !== '' && Number(hostingAmount) > 0) {
      hostingMaintenance = formatHostingMaintenance({
        amount: Number(hostingAmount),
        period: hostingPeriod,
      })
    }

    const payload = {
      clientId: clientId || null,
      clientName: name,
      clientEmail: clientEmail.trim() || null,
      lineItems: lineItems
        .map(row => ({ work: row.work.trim(), cost: Number(row.cost) }))
        .filter(row => row.work && row.cost > 0),
      hostingAmount: hostingAmount === '' ? null : Number(hostingAmount),
      hostingPeriod: hostingAmount === '' ? null : hostingPeriod,
      hostingCustomPeriod: null,
      hostingMaintenance,
      ibans: selectedIbans.map(row => ({
        bankName: row.bankName,
        iban: row.iban,
        swiftBic: row.swiftBic,
        label: row.label,
      })),
      upfrontPercent,
      excludeVat,
    }

    if (payload.lineItems.length === 0) {
      notifyError('Add at least one work item with a cost')
      return null
    }
    if (payload.ibans.length === 0) {
      notifyError('Select at least one bank account')
      return null
    }

    return payload
  }

  function handleSubmit(sendEmail: boolean) {
    const payload = buildPayload()
    if (!payload) return

    if (sendEmail) {
      const to = payload.clientEmail ? normalizeEmailAddress(payload.clientEmail) : null
      if (!to || !isValidEmailAddress(to)) {
        notifyError('Enter a valid client email to send the offer')
        return
      }
    }

    startTransition(async () => {
      const result = await runWithToast(
        () =>
          isEditing && offer
            ? updateFinancialOffer(offer.id, payload, { sendEmail })
            : submitFinancialOffer(payload, { sendEmail }),
        {
          loading: sendEmail
            ? isEditing
              ? 'Updating and emailing…'
              : 'Saving and emailing…'
            : isEditing
              ? 'Updating offer…'
              : 'Saving offer…',
          success: sendEmail
            ? isEditing
              ? 'Offer updated and emailed'
              : 'Offer saved and emailed'
            : isEditing
              ? 'Offer updated — download the latest PDF anytime'
              : 'Offer saved — email it anytime from Financial offers',
        }
      )
      if (result === null) return

      try {
        await downloadOfferPdf(result.id, offerFilename(payload.clientName))
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Could not download the offer PDF')
      }

      if (isEditing) {
        router.push(`/admin/ops/financial-offers/${result.id}`)
        router.refresh()
      }
    })
  }

  return (
    <div className="financial-offer-form space-y-6">
      <section className="dash-panel px-5 py-5 space-y-4">
        <ClientSelectWithCreate
          clients={clients}
          value={clientId}
          onChange={id => {
            setClientId(id)
            const client = clients.find(row => row.id === id)
            if (client) {
              setClientName(client.name)
              setClientEmail(client.email ?? '')
            }
          }}
          disabled={pending}
          selectId="offer-client"
          label="Link to client"
          placeholder="Select a client (recommended)"
          required={false}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="dash-label" htmlFor="offer-client-name">
              Client name on offer <span className="dash-label-required">*</span>
            </label>
            <input
              id="offer-client-name"
              className="btf-input w-full"
              placeholder="e.g. Mania Zamani"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <label className="dash-label" htmlFor="offer-client-email">
              Client email <span className="dash-meta">(for sending PDF)</span>
            </label>
            <input
              id="offer-client-email"
              type="email"
              className="btf-input w-full"
              placeholder="client@example.com"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="dash-label mb-0">Work & cost</p>
            <button
              type="button"
              className="dash-btn-secondary text-xs cursor-pointer"
              onClick={() => setLineItems(rows => [...rows, emptyLine()])}
              disabled={pending}
            >
              <Plus size={14} />
              Add line
            </button>
          </div>

          <div className="financial-offer-lines space-y-2">
            {lineItems.map((row, index) => (
              <div key={index} className="financial-offer-line grid grid-cols-1 lg:grid-cols-[1fr_8rem_auto] gap-2">
                <input
                  className="btf-input w-full"
                  placeholder="e.g. UI/UX Design"
                  value={row.work}
                  onChange={e => updateLine(index, { work: e.target.value })}
                  disabled={pending}
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="btf-input w-full tabular-nums"
                  placeholder="Cost"
                  value={row.cost || ''}
                  onChange={e => updateLine(index, { cost: Number(e.target.value) || 0 })}
                  disabled={pending}
                />
                <button
                  type="button"
                  className="financial-offer-remove cursor-pointer"
                  aria-label="Remove line"
                  onClick={() => setLineItems(rows => rows.filter((_, i) => i !== index))}
                  disabled={pending || lineItems.length <= 1}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="dash-label" htmlFor="offer-hosting-amount">
            Hosting & maintenance <span className="dash-meta">(optional)</span>
          </label>
          <div className="financial-offer-hosting grid grid-cols-1 lg:grid-cols-[8rem_8rem_1fr] gap-2 max-w-xl">
            <input
              id="offer-hosting-amount"
              type="number"
              min={0}
              step={1}
              className="btf-input w-full tabular-nums"
              placeholder="Amount"
              value={hostingAmount}
              onChange={e =>
                setHostingAmount(e.target.value === '' ? '' : Number(e.target.value) || 0)
              }
              disabled={pending}
            />
            <select
              id="offer-hosting-period"
              className="dash-select w-full text-sm"
              value={hostingPeriod}
              onChange={e => setHostingPeriod(e.target.value as HostingMaintenancePeriod)}
              disabled={pending}
            >
              {HOSTING_PERIOD_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="dash-meta self-center text-sm">
              {HOSTING_PERIOD_OPTIONS.find(option => option.value === hostingPeriod)?.label ??
                'Billed yearly'}
            </p>
          </div>
        </div>

        <label className="financial-offer-vat-toggle">
          <input
            type="checkbox"
            checked={excludeVat}
            onChange={e => setExcludeVat(e.target.checked)}
            disabled={pending}
          />
          <span>
            Costs exclude VAT (24%) — adds label on PDF Cost column and a footnote
          </span>
        </label>
      </section>

      <section className="financial-offer-summary dash-panel px-5 py-5">
        <p className="dash-section-title mb-4">Totals</p>
        <dl className="financial-offer-totals">
          <div>
            <dt>Project total</dt>
            <dd className="tabular-nums">{formatOfferCurrency(totals.total)}</dd>
          </div>
          <div>
            <dt>{totals.upfrontPercent}% upfront</dt>
            <dd className="tabular-nums" data-emphasis="true">
              {formatOfferCurrency(totals.upfrontAmount)}
            </dd>
          </div>
          <div>
            <dt>Balance on delivery</dt>
            <dd className="tabular-nums">
              {formatOfferCurrency(Math.max(0, totals.total - totals.upfrontAmount))}
            </dd>
          </div>
        </dl>
      </section>

      <section className="dash-panel px-5 py-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="dash-label mb-0">Bank accounts</p>
            <p className="dash-meta mt-1">
              Select from saved IBANs.{' '}
              <Link href="/admin/ops/company" className="dash-link-accent">
                Manage in Company settings
              </Link>
            </p>
          </div>
        </div>

        <div className="financial-offer-iban-table">
          <div className="financial-offer-iban-grid financial-offer-iban-grid-head">
            <span aria-hidden="true" />
            <span>Bank</span>
            <span>IBAN</span>
            <span>Swift / BIC</span>
          </div>
          {savedIbans.map(row => (
            <label
              key={row.id}
              className={`financial-offer-iban-grid financial-offer-iban-row${
                selectedIbanIds.has(row.id) ? ' financial-offer-iban-row--selected' : ''
              }`}
            >
              <input
                type="checkbox"
                className="financial-offer-iban-check"
                checked={selectedIbanIds.has(row.id)}
                onChange={() => toggleIban(row.id)}
                disabled={pending || (selectedIbanIds.has(row.id) && selectedIbanIds.size <= 1)}
                aria-label={`Include ${row.bankName}`}
              />
              <span className="financial-offer-iban-bank">
                {row.label ? (
                  <span className="financial-offer-iban-label">{row.label}</span>
                ) : null}
                {row.bankName}
              </span>
              <span className="financial-offer-iban-value financial-offer-iban-value--iban">
                {row.iban}
              </span>
              <span className="financial-offer-iban-value financial-offer-iban-value--swift">
                {row.swiftBic}
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="dash-btn-primary btn-primary cursor-pointer"
          disabled={pending}
          onClick={() => handleSubmit(false)}
        >
          {pending ? 'Saving…' : 'Save & download'}
        </button>
        <button
          type="button"
          className="dash-btn-secondary cursor-pointer"
          disabled={pending}
          onClick={() => handleSubmit(true)}
        >
          {pending ? 'Sending…' : 'Save & email'}
        </button>
        {isEditing && offer ? (
          <Link href={`/admin/ops/financial-offers/${offer.id}`} className="dash-btn-ghost">
            Cancel
          </Link>
        ) : null}
      </div>
    </div>
  )
}
