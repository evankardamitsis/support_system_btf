import { formatHoursShort } from '@/lib/tickets/display'
import type { TicketStatus } from '@/lib/types'

export type PortalHoursRowTone = 'default' | 'over' | 'under' | 'pending' | 'accent'

export type PortalHoursBreakdownRow = {
  label: string
  value: string
  tone?: PortalHoursRowTone
}

export type PortalHoursBreakdown = {
  headline: { label: string; value: string }
  rows: PortalHoursBreakdownRow[]
  note?: { label: string; body: string }
  hint?: string
}

function getDifference(
  estimatedHours: number,
  actualHours: number
): { tone: 'over' | 'under'; value: string } | null {
  const delta = Math.round((actualHours - estimatedHours) * 100) / 100
  if (Math.abs(delta) <= 0.01) return null
  if (delta > 0) {
    return { tone: 'over', value: `${formatHoursShort(delta)} over estimate` }
  }
  return { tone: 'under', value: `${formatHoursShort(Math.abs(delta))} under estimate` }
}

export function buildPortalHoursBreakdown(input: {
  closed: boolean
  status: TicketStatus
  estimatedHours: number | null
  actualHours: number | null
  approvedExtraMinutes: number
  pendingExtraMinutes: number
  extraHoursActiveAt: string | null
  estimateStatus: 'pending_approval' | 'approved' | null
  hoursOverageNote: string | null
}): PortalHoursBreakdown | null {
  const hasEstimate = input.estimatedHours != null && input.estimatedHours > 0
  const hasLogged = input.actualHours != null && input.actualHours > 0
  const extraHours = input.approvedExtraMinutes / 60
  const pendingExtraHours = input.pendingExtraMinutes / 60
  const extraWorkActive =
    !input.closed && input.extraHoursActiveAt != null && input.status === 'in_progress'

  if (extraWorkActive) {
    const rows: PortalHoursBreakdownRow[] = []
    if (hasEstimate) {
      rows.push({ label: 'Est', value: formatHoursShort(input.estimatedHours!) })
    }
    if (hasLogged) {
      rows.push({ label: 'Logged', value: formatHoursShort(input.actualHours!) })
    }
    if (extraHours > 0) {
      rows.push({ label: 'Extra approved', value: formatHoursShort(extraHours), tone: 'accent' })
    }
    rows.push({ label: 'Status', value: 'Extra work in progress', tone: 'pending' })

    return {
      headline: hasLogged
        ? { label: 'Logged', value: formatHoursShort(input.actualHours!) }
        : hasEstimate
          ? { label: 'Est', value: formatHoursShort(input.estimatedHours!) }
          : { label: 'Extra work', value: formatHoursShort(extraHours) },
      rows,
      hint: 'Approved extra hours will be billed when BTF marks the ticket resolved.',
    }
  }

  if (input.closed && hasLogged) {
    const rows: PortalHoursBreakdownRow[] = []

    if (hasEstimate) {
      rows.push({ label: 'Est', value: formatHoursShort(input.estimatedHours!) })
      const difference = getDifference(input.estimatedHours!, input.actualHours!)
      if (difference) {
        rows.push({ label: 'Difference', value: difference.value, tone: difference.tone })
      }
    }

    if (extraHours > 0) {
      rows.push({ label: 'Extra', value: formatHoursShort(extraHours), tone: 'accent' })
      rows.push({
        label: 'Total billed',
        value: formatHoursShort(input.actualHours! + extraHours),
        tone: 'accent',
      })
    }

    if (pendingExtraHours > 0) {
      rows.push({
        label: 'Extra (pending)',
        value: `${formatHoursShort(pendingExtraHours)} awaiting approval`,
        tone: 'pending',
      })
    }

    const overEstimate =
      hasEstimate && input.actualHours! > input.estimatedHours! + 0.01
    const note =
      overEstimate && input.hoursOverageNote?.trim()
        ? { label: 'Why more time was needed', body: input.hoursOverageNote.trim() }
        : undefined

    return {
      headline: { label: 'Logged', value: formatHoursShort(input.actualHours!) },
      rows,
      note,
    }
  }

  if (hasEstimate) {
    const rows: PortalHoursBreakdownRow[] = []
    if (hasLogged) {
      rows.push({ label: 'Logged', value: formatHoursShort(input.actualHours!) })
      if (hasEstimate) {
        const difference = getDifference(input.estimatedHours!, input.actualHours!)
        if (difference) {
          rows.push({ label: 'Difference', value: difference.value, tone: difference.tone })
        }
      }
    }

    return {
      headline: { label: 'Est', value: formatHoursShort(input.estimatedHours!) },
      rows,
      hint:
        input.estimateStatus === 'pending_approval'
          ? 'Approve the estimate so BTF can start work.'
          : !hasLogged
            ? 'Logged hours appear here once the ticket is resolved.'
            : undefined,
    }
  }

  if (pendingExtraHours > 0 && input.closed) {
    return {
      headline: { label: 'Logged', value: hasLogged ? formatHoursShort(input.actualHours!) : '—' },
      rows: [
        {
          label: 'Extra (pending)',
          value: `${formatHoursShort(pendingExtraHours)} awaiting approval`,
          tone: 'pending',
        },
      ],
    }
  }

  return null
}
