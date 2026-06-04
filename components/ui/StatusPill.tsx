import type { TicketStatus } from '@/lib/types'

const config: Record<TicketStatus, { label: string; className: string }> = {
  open:              { label: 'Open',       className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  in_progress:       { label: 'In Progress',className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
  waiting_on_client: { label: 'Waiting',    className: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
  resolved:          { label: 'Resolved',   className: 'bg-green-50 text-green-700 ring-green-600/20' },
  closed:            { label: 'Closed',     className: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
}

export function StatusPill({ status }: { status: TicketStatus }) {
  const { label, className } = config[status] ?? config.closed
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {label}
    </span>
  )
}
