import type { TicketPriority } from '@/lib/types'

const config: Record<TicketPriority, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#f87171' },
  high:     { label: 'High',     color: '#fb923c' },
  normal:   { label: 'Normal',   color: '#888' },
  low:      { label: 'Low',      color: '#555' },
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const { label, color } = config[priority] ?? config.normal
  return (
    <span
      className="text-xs font-medium"
      style={{ color, fontFamily: 'var(--font-dm-mono)' }}
    >
      {label}
    </span>
  )
}
