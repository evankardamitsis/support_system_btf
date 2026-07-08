'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useModalDialog } from '@/lib/ui/use-modal-dialog'
import type { ClientOption } from './TicketsClientFilter'

export function TicketsExportButton({ clients }: { clients: ClientOption[] }) {
  const [open, setOpen] = useState(false)
  const dialogRef = useModalDialog(open, () => setOpen(false))
  const [clientId, setClientId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [monthlyResolvedOnly, setMonthlyResolvedOnly] = useState(false)
  const [month, setMonth] = useState('')

  function exportHref() {
    const params = new URLSearchParams()
    if (clientId) params.set('client', clientId)
    if (monthlyResolvedOnly) {
      params.set('report', 'monthly_resolved')
      if (month) params.set('month', month)
    } else {
      if (from) params.set('from', from)
      if (to) params.set('to', to)
    }
    const q = params.toString()
    return q ? `/api/tickets/export?${q}` : '/api/tickets/export'
  }

  return (
    <>
      <button
        type="button"
        className="dash-btn-ghost cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Download size={14} />
        Export
      </button>

      <dialog ref={dialogRef} className="ticket-modal ticket-modal--ops-form">
        {open ? (
          <div className="ticket-modal-inner">
            <h2 className="ticket-modal-title">Export tickets</h2>
            <p className="ticket-modal-sub">
              Download a CSV of tickets, optionally filtered by client and date range, or export a
              monthly resolved-tickets report for clients.
            </p>

            <div className="ops-add-task-modal-form">
              <div>
                <label className="dash-label" htmlFor="export-client">
                  Client
                </label>
                <select
                  id="export-client"
                  className="btf-input w-full"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                >
                  <option value="">All clients</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <label className="inline-flex items-center gap-2 text-sm" htmlFor="monthly-report">
                  <input
                    id="monthly-report"
                    type="checkbox"
                    checked={monthlyResolvedOnly}
                    onChange={e => setMonthlyResolvedOnly(e.target.checked)}
                  />
                  Monthly report (resolved tickets only)
                </label>

                {monthlyResolvedOnly ? (
                  <div>
                    <label className="dash-label" htmlFor="export-month">
                      Month
                    </label>
                    <input
                      id="export-month"
                      type="month"
                      className="btf-input w-full"
                      value={month}
                      onChange={e => setMonth(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="dash-label" htmlFor="export-from">
                        From
                      </label>
                      <input
                        id="export-from"
                        type="date"
                        className="btf-input w-full"
                        value={from}
                        max={to || undefined}
                        onChange={e => setFrom(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="dash-label" htmlFor="export-to">
                        To
                      </label>
                      <input
                        id="export-to"
                        type="date"
                        className="btf-input w-full"
                        value={to}
                        min={from || undefined}
                        onChange={e => setTo(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="ticket-modal-actions">
                <button
                  type="button"
                  className="dash-btn-secondary cursor-pointer"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <a
                  href={exportHref()}
                  className="dash-btn-primary btn-primary"
                  onClick={() => setOpen(false)}
                >
                  Download CSV
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  )
}
