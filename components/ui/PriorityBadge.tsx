import type { TicketPriority } from '@/lib/types'

const config: Record<TicketPriority, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'text-red-600 font-semibold' },
  high:     { label: 'High',     className: 'text-orange-600 font-medium' },
  normal:   { label: 'Normal',   className: 'text-gray-600' },
  low:      { label: 'Low',      className: 'text-gray-400' },
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const { label, className } = config[priority] ?? config.normal
  return (
    <span className={`text-sm ${className}`}>{label}</span>
  )
}
