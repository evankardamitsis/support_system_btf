'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { getClientRetainerTableDetail } from '@/app/actions/retainers'
import type { RetainerDetail } from './TicketsTable'
import { formatPackageName } from '@/lib/retainers/packages'

function formatPeriod(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) {
    return `${s.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} (${fmt(s)} – ${fmt(e)})`
  }
  return `${fmt(s)} – ${fmt(e)}`
}

function RetainerModal({
  clientName,
  detail,
  loading,
  error,
  onClose,
}: {
  clientName: string
  detail: RetainerDetail | null
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="rm-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        className={`rm-card${detail ? ` rm-card--${detail.level}` : ''}`}
        data-rm-panel
        role="dialog"
        aria-modal
        aria-label={`Retainer status for ${clientName}`}
        aria-busy={loading}
      >
        <div className="rm-head">
          <div className="rm-head-text">
            <span className="rm-client">{clientName}</span>
            {detail ? (
              <span className="rm-meta">
                {formatPackageName(detail.packageName)} · {formatPeriod(detail.periodStart, detail.periodEnd)}
                {!detail.isCurrentPeriod ? ' · previous period' : ''}
              </span>
            ) : (
              <span className="rm-meta">Hour-based retainer</span>
            )}
          </div>
          <button type="button" className="rm-close" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {loading ? (
          <p className="rm-empty">Loading retainer…</p>
        ) : error ? (
          <p className="rm-empty rm-empty--error">{error}</p>
        ) : !detail ? (
          <p className="rm-empty">No retainer period is set up for this client yet.</p>
        ) : (
          <>
            <div className="rm-body">
              <div className="rm-stat rm-stat--primary">
                <div className="rm-stat-head">
                  <span className="rm-stat-label">Billed this period</span>
                  <span className="rm-stat-numbers">
                    <span className={`rm-stat-current rm-stat-current--${detail.level}`}>
                      {detail.hoursUsed.toFixed(1)}h
                    </span>
                    <span className="rm-stat-sep">/</span>
                    <span className="rm-stat-total">{detail.hoursTotal}h</span>
                    <span className={`rm-stat-pct rm-stat-pct--${detail.level}`}>
                      {detail.hoursTotal > 0
                        ? Math.round(Math.min(100, (detail.hoursUsed / detail.hoursTotal) * 100))
                        : 0}
                      %
                    </span>
                  </span>
                </div>
                <div className="rm-bar">
                  <div
                    className={`rm-bar-fill rm-bar-fill--billed rm-bar-fill--${detail.level}`}
                    style={{
                      width: `${
                        detail.hoursTotal > 0
                          ? Math.min(100, (detail.hoursUsed / detail.hoursTotal) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="rm-summary">
                <div className="rm-summary-item">
                  <span className="rm-summary-label">Remaining</span>
                  <span
                    className={`rm-summary-value rm-summary-value--${
                      detail.hoursRemaining < 0 ? 'over' : detail.level
                    }`}
                  >
                    {detail.hoursRemaining < 0
                      ? `${Math.abs(detail.hoursRemaining).toFixed(1)}h over cap`
                      : `${detail.hoursRemaining.toFixed(1)}h remaining`}
                  </span>
                </div>
                <div className="rm-summary-item">
                  <span className="rm-summary-label">Committed estimates</span>
                  <span className="rm-summary-value tabular-nums">
                    {detail.committedHours.toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>

            <div className="rm-footer">
              <span className="rm-footer-tickets">
                {detail.ticketCount} ticket{detail.ticketCount !== 1 ? 's' : ''} this period
              </span>
              {detail.committedHours > detail.hoursTotal ? (
                <span className="rm-footer-status rm-footer-status--over">
                  {(detail.committedHours - detail.hoursTotal).toFixed(1)}h over cap in estimates
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function ClientRetainerPopover({
  clientId,
  clientName,
  detail: initialDetail,
  hoursBilling = true,
}: {
  clientId: string
  clientName: string
  detail: RetainerDetail | null
  hoursBilling?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [detail, setDetail] = useState<RetainerDetail | null>(initialDetail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const close = useCallback(() => setOpen(false), [])
  const hasAlert = detail != null && detail.level !== 'ok'

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setDetail(null)

    void getClientRetainerTableDetail(clientId)
      .then(next => {
        if (cancelled) return
        setDetail(next)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load retainer')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, clientId])

  if (!hoursBilling) {
    return <span className="tickets-client-name">{clientName}</span>
  }

  return (
    <>
      <button
        type="button"
        className={`retainer-trigger${hasAlert ? ` retainer-trigger--${detail!.level}` : ''}`}
        onClick={() => setOpen(true)}
        title="View retainer progress"
      >
        <span className="retainer-trigger-name">{clientName}</span>
        {hasAlert ? <span className="retainer-trigger-dot" aria-hidden /> : null}
      </button>

      {open && portalReady
        ? createPortal(
            <RetainerModal
              clientName={clientName}
              detail={detail}
              loading={loading}
              error={error}
              onClose={close}
            />,
            document.body
          )
        : null}
    </>
  )
}
