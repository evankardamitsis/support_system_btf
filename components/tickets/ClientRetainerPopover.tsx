'use client'

import { useState, useEffect, useCallback } from 'react'
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
  detail: RetainerDetail
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const billedPct = detail.hoursTotal > 0
    ? Math.min(100, (detail.hoursUsed / detail.hoursTotal) * 100)
    : 0
  const committedPct = detail.hoursTotal > 0
    ? Math.min(100, (detail.committedHours / detail.hoursTotal) * 100)
    : 0
  const available = detail.hoursTotal - detail.committedHours
  const isOver = detail.level === 'over'

  return (
    <div
      className="rm-backdrop"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
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
            </span>
          </div>
          <button type="button" className="rm-close" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="rm-body">
          <div className="rm-stat">
            <div className="rm-stat-head">
              <span className="rm-stat-label">Billed</span>
              <span className="rm-stat-numbers">
                <span className="rm-stat-current">{detail.hoursUsed.toFixed(1)}h</span>
                <span className="rm-stat-sep">/</span>
                <span className="rm-stat-total">{detail.hoursTotal}h</span>
                <span className="rm-stat-pct">{Math.round(billedPct)}%</span>
              </span>
            </div>
            <div className="rm-bar">
              <div className="rm-bar-fill rm-bar-fill--billed" style={{ width: `${billedPct}%` }} />
            </div>
          </div>

          <div className="rm-stat">
            <div className="rm-stat-head">
              <span className="rm-stat-label">Committed <span className="rm-stat-label-sub">(all period estimates)</span></span>
              <span className="rm-stat-numbers">
                <span className={`rm-stat-current rm-stat-current--${detail.level}`}>
                  {detail.committedHours.toFixed(1)}h
                </span>
                <span className="rm-stat-sep">/</span>
                <span className="rm-stat-total">{detail.hoursTotal}h</span>
                <span className={`rm-stat-pct rm-stat-pct--${detail.level}`}>{Math.round(committedPct)}%</span>
              </span>
            </div>
            <div className="rm-bar">
              <div
                className={`rm-bar-fill rm-bar-fill--committed rm-bar-fill--${detail.level}`}
                style={{ width: `${committedPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rm-footer">
          <span className="rm-footer-tickets">
            {detail.ticketCount} ticket{detail.ticketCount !== 1 ? 's' : ''} this period
          </span>
          {isOver ? (
            <span className="rm-footer-status rm-footer-status--over">
              {(detail.committedHours - detail.hoursTotal).toFixed(1)}h over cap
            </span>
          ) : available > 0 ? (
            <span className="rm-footer-status">
              {available.toFixed(1)}h remaining
            </span>
          ) : (
            <span className="rm-footer-status rm-footer-status--over">Cap reached</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function ClientRetainerPopover({
  clientName,
  detail,
}: {
  clientName: string
  detail: RetainerDetail
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const hasAlert = detail.level !== 'ok'

  return (
    <>
      <button
        type="button"
        className={`retainer-trigger${hasAlert ? ` retainer-trigger--${detail.level}` : ''}`}
        onClick={() => setOpen(true)}
        title="View retainer status"
      >
        <span className="retainer-trigger-name">{clientName}</span>
        {hasAlert && <span className="retainer-trigger-dot" aria-hidden />}
      </button>

      {open && <RetainerModal clientName={clientName} detail={detail} onClose={close} />}
    </>
  )
}
