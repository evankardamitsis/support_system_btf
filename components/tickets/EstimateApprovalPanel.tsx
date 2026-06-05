'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { approveTicketEstimate } from '@/app/actions/tickets'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { formatTicketPriority, runWithToast } from '@/lib/notify'
import type { TicketPriority } from '@/lib/types'

export function EstimateApprovalPanel({
  ticketId,
  estimatedHours,
  priority,
}: {
  ticketId: string
  estimatedHours: number
  priority: TicketPriority
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const hoursLabel = estimatedHours.toFixed(2).replace(/\.00$/, '')

  return (
    <section
      className="dash-panel"
      style={{
        borderLeft: '3px solid var(--accent)',
        background: 'var(--surface)',
      }}
    >
      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="dash-section-title mb-1">Approve BTF estimate</p>
          <p className="dash-meta leading-relaxed">
            Review the estimated time and priority below. BTF will start work once you approve.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-baseline gap-2">
            <span className="dash-meta uppercase">Estimate</span>
            <span className="font-mono tabular-nums text-lg" style={{ color: 'var(--text-1)' }}>
              {hoursLabel}h
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="dash-meta uppercase">Priority</span>
            <PriorityBadge priority={priority} />
          </div>
        </div>

        <button
          type="button"
          className="dash-btn-primary btn-primary w-full sm:w-auto cursor-pointer"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const ok = await runWithToast(() => approveTicketEstimate(ticketId), {
                loading: 'Approving estimate…',
                success: `Approved ${hoursLabel}h at ${formatTicketPriority(priority)} priority`,
              })
              if (ok !== null) router.refresh()
            })
          }
        >
          {pending ? 'Approving…' : 'Approve estimate'}
        </button>
      </div>
    </section>
  )
}
