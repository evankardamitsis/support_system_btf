import type { TicketStatus } from '@/lib/types'

const config: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:              { label: 'Open',        color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  in_progress:       { label: 'In Progress', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  waiting_on_client: { label: 'Waiting',     color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  on_hold:           { label: 'On hold',     color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  resolved:          { label: 'Resolved',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  closed:            { label: 'Closed',      color: '#888',    bg: 'rgba(136,136,136,0.1)' },
}

export function StatusPill({ status }: { status: TicketStatus }) {
  const { label, color, bg } = config[status] ?? config.closed
  return (
    <span
      className="inline-flex items-center text-[11px] font-medium px-2 py-0.5"
      style={{
        color,
        background: bg,
        border: `1px solid ${color}22`,
        borderRadius: 0,
        fontFamily: 'var(--font-dm-mono)',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
  )
}
