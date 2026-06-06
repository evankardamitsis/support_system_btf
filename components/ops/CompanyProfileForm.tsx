'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  removeCompanyIban,
  saveCompanyIban,
  updateCompanyProfile,
} from '@/app/actions/company-profile'
import { runWithToast } from '@/lib/notify'
import type { SavedCompanyIban } from '@/lib/ops/financial-offer/types'

type CompanyProfileFormProps = {
  profile: {
    name: string
    address: string
    mobile: string
    phone: string
    email: string
    upfrontPercent: number
  }
  ibans: SavedCompanyIban[]
}

export function CompanyProfileForm({ profile, ibans }: CompanyProfileFormProps) {
  const [pending, startTransition] = useTransition()
  const [ibanRows, setIbanRows] = useState(ibans)
  const [showNewIban, setShowNewIban] = useState(false)

  function refreshAfterIbanChange() {
    startTransition(() => {
      window.location.reload()
    })
  }

  return (
    <div className="space-y-6">
      <form
        className="dash-panel px-5 py-5 space-y-4"
        onSubmit={e => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          startTransition(async () => {
            const ok = await runWithToast(() => updateCompanyProfile(formData), {
              loading: 'Saving company profile…',
              success: 'Company profile saved',
            })
            if (ok === null) return
          })
        }}
      >
        <p className="dash-section-title">Company profile</p>
        <p className="dash-meta leading-relaxed -mt-2">
          Used on financial offer PDFs — letterhead, contact details, and default upfront %.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="dash-label" htmlFor="company-name">
              Company name
            </label>
            <input
              id="company-name"
              name="name"
              required
              className="btf-input w-full"
              defaultValue={profile.name}
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="dash-label" htmlFor="company-address">
              Address
            </label>
            <input
              id="company-address"
              name="address"
              required
              className="btf-input w-full"
              defaultValue={profile.address}
              disabled={pending}
            />
          </div>
          <div>
            <label className="dash-label" htmlFor="company-mobile">
              Mobile
            </label>
            <input
              id="company-mobile"
              name="mobile"
              required
              className="btf-input w-full"
              defaultValue={profile.mobile}
              disabled={pending}
            />
          </div>
          <div>
            <label className="dash-label" htmlFor="company-phone">
              Phone
            </label>
            <input
              id="company-phone"
              name="phone"
              required
              className="btf-input w-full"
              defaultValue={profile.phone}
              disabled={pending}
            />
          </div>
          <div>
            <label className="dash-label" htmlFor="company-email">
              Email
            </label>
            <input
              id="company-email"
              name="email"
              type="email"
              required
              className="btf-input w-full"
              defaultValue={profile.email}
              disabled={pending}
            />
          </div>
          <div>
            <label className="dash-label" htmlFor="company-upfront">
              Default upfront %
            </label>
            <input
              id="company-upfront"
              name="upfront_percent"
              type="number"
              min={1}
              max={99}
              required
              className="btf-input w-full tabular-nums"
              defaultValue={profile.upfrontPercent}
              disabled={pending}
            />
          </div>
        </div>

        <button type="submit" className="dash-btn-primary btn-primary cursor-pointer" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <section className="dash-panel px-5 py-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="dash-section-title mb-1">Saved IBANs</p>
            <p className="dash-meta">Reused when building financial offers.</p>
          </div>
          <button
            type="button"
            className="dash-btn-secondary text-xs cursor-pointer"
            onClick={() => setShowNewIban(v => !v)}
            disabled={pending}
          >
            <Plus size={14} />
            Add IBAN
          </button>
        </div>

        {showNewIban ? (
          <form
            className="company-iban-form grid grid-cols-1 lg:grid-cols-2 gap-3 p-4 border border-[var(--border)]"
            onSubmit={e => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              startTransition(async () => {
                const ok = await runWithToast(() => saveCompanyIban(formData), {
                  loading: 'Adding IBAN…',
                  success: 'IBAN saved',
                })
                if (ok === null) return
                setShowNewIban(false)
                refreshAfterIbanChange()
              })
            }}
          >
            <input name="label" className="btf-input w-full" placeholder="Label (optional)" disabled={pending} />
            <input
              name="bank_name"
              required
              className="btf-input w-full"
              placeholder="Bank name"
              disabled={pending}
            />
            <input
              name="iban"
              required
              className="btf-input w-full font-mono text-sm sm:col-span-2"
              placeholder="IBAN"
              disabled={pending}
            />
            <input
              name="swift_bic"
              required
              className="btf-input w-full font-mono text-sm"
              placeholder="Swift / BIC"
              disabled={pending}
            />
            <button type="submit" className="dash-btn-primary btn-primary cursor-pointer" disabled={pending}>
              Save IBAN
            </button>
          </form>
        ) : null}

        <div className="space-y-3">
          {ibanRows.map(row => (
            <form
              key={row.id}
              className="company-iban-card grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start"
              onSubmit={e => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                formData.set('id', row.id)
                startTransition(async () => {
                  const ok = await runWithToast(() => saveCompanyIban(formData), {
                    loading: 'Updating IBAN…',
                    success: 'IBAN updated',
                  })
                  if (ok === null) return
                })
              }}
            >
              <input type="hidden" name="id" value={row.id} />
              <div>
                <label className="dash-label text-[10px]">Label</label>
                <input
                  name="label"
                  className="btf-input w-full text-sm"
                  defaultValue={row.label ?? ''}
                  placeholder="e.g. Primary"
                  disabled={pending}
                />
              </div>
              <div>
                <label className="dash-label text-[10px]">Bank</label>
                <input
                  name="bank_name"
                  required
                  className="btf-input w-full text-sm"
                  defaultValue={row.bankName}
                  disabled={pending}
                />
              </div>
              <div>
                <label className="dash-label text-[10px]">Swift / BIC</label>
                <input
                  name="swift_bic"
                  required
                  className="btf-input w-full font-mono text-sm"
                  defaultValue={row.swiftBic}
                  disabled={pending}
                />
              </div>
              <div className="flex gap-2 sm:pt-5">
                <button
                  type="submit"
                  className="dash-btn-secondary text-xs cursor-pointer"
                  disabled={pending}
                >
                  Save
                </button>
                {row.id !== 'default' ? (
                  <button
                    type="button"
                    className="financial-offer-remove cursor-pointer"
                    aria-label="Remove IBAN"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const ok = await runWithToast(() => removeCompanyIban(row.id), {
                          loading: 'Removing…',
                          success: 'IBAN removed',
                        })
                        if (ok === null) return
                        setIbanRows(rows => rows.filter(r => r.id !== row.id))
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
              <div className="sm:col-span-4">
                <label className="dash-label text-[10px]">IBAN</label>
                <input
                  name="iban"
                  required
                  className="btf-input w-full font-mono text-sm"
                  defaultValue={row.iban}
                  disabled={pending}
                />
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  )
}
