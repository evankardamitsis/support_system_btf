'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { RetainerDetail } from './TicketsTable'
import { formatPackageName } from '@/lib/retainers/packages'

function formatPeriod(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  return `${fmt(s)} – ${fmt(e)}`
}

function RetainerModal({
  clientName,
  detail,
  onClose,
}: {
  clientName: string
  detail: RetainerDetail | null
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

  if (!detail) {
    return (
      <div
        className="rm-backdrop"
        onMouseDown={e => {
          if (e.target === e.currentTarget) onClose()
        }}
        role="presentation"
      >
        <div className="rm-card" role="dialog" aria-modal aria-label={`Retainer status for ${clientName}`}>
          <div className="rm-head">
            <div className="rm-head-text">
              <span className="rm-client">{clientName}</span>
              <span className="rm-meta">Hour-based retainer</span>
            </div>
            <button type="button" className="rm-close" onClick={onClose} aria-label="Close">
              <X size={15} />
            </button>
          </div>
          <p className="rm-empty">No retainer period is set up for this client yet.</p>
        </div>
      </div>
    )
  }

  const billedPct =
    detail.hoursTotal > 0 ? Math.min(100, (detail.hoursUsed / detail.hoursTotal) * 100) : 0
  const isOver = detail.hoursRemaining < 0
  const remainingLabel = isOver
    ? `${Math.abs(detail.hoursRemaining).toFixed(1)}h over cap`
    : `${detail.hoursRemaining.toFixed(1)}h remaining`

  return (
    <div
      className="rm-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        className={`rm-card rm-card--${detail.level}`}
        role="dialog"
        aria-modal
        aria-label={`Retainer status for ${clientName}`}
      >
        <div className="rm-head">
          <div className="rm-head-text">
            <span className="rm-client">{clientName}</span>
            <span className="rm-meta">
              {formatPackageName(detail.packageName)} · {formatPeriod(detail.periodStart, detail.periodEnd)}
              {!detail.isCurrentPeriod ? ' · previous period' : ''}
            </span>
          </div>
          <button type="button" className="rm-close" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

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
                  {Math.round(billedPct)}%
                </span>
              </span>
            </div>
            <div className="rm-bar">
              <div
                className={`rm-bar-fill rm-bar-fill--billed rm-bar-fill--${detail.level}`}
                style={{ width: `${billedPct}%` }}
              />
            </div>
          </div>

          <div className="rm-summary">
            <div className="rm-summary-item">
              <span className="rm-summary-label">Remaining</span>
              <span className={`rm-summary-value rm-summary-value--${isOver ? 'over' : detail.level}`}>
                {remainingLabel}
              </span>
            </div>
            <div className="rm-summary-item">
              <span className="rm-summary-label">Committed estimates</span>
              <span className="rm-summary-value tabular-nums">{detail.committedHours.toFixed(1)}h</span>
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
      </div>
    </div>
  )
}

export function ClientRetainerPopover({
  clientName,
  detail,
  hoursBilling = true,
}: {
  clientName: string
  detail: RetainerDetail | null
  hoursBilling?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const hasAlert = detail != null && detail.level !== 'ok'

  useEffect(() => {
    setPortalReady(true)
  }, [])

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
            <div data-theme="dashboard">
              <RetainerModal clientName={clientName} detail={detail} onClose={close} />
            </div>,
            document.body
          )
        : null}
    </>
  )
}
