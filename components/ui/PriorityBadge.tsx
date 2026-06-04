import type { TicketPriority } from '@/lib/types'

const config: Record<TicketPriority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
  high: { label: 'High', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.1)' },
  normal: { label: 'Normal', color: '#888888', bg: 'rgba(136, 136, 136, 0.1)' },
  low: { label: 'Low', color: '#666666', bg: 'rgba(102, 102, 102, 0.12)' },
}

export function PriorityBadge({
  priority,
  variant = 'text',
}: {
  priority: TicketPriority
  variant?: 'text' | 'pill'
}) {
  const { label, color, bg } = config[priority] ?? config.normal

  if (variant === 'pill') {
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

  return (
    <span
      className="text-xs font-medium"
      style={{ color, fontFamily: 'var(--font-dm-mono)' }}
    >
      {label}
    </span>
  )
}
