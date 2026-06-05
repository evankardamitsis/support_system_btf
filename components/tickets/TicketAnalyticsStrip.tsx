import { MetricStrip } from '@/components/dashboard/MetricStrip'
import type { TicketAnalytics } from '@/lib/tickets/analytics'

export function TicketAnalyticsStrip({ analytics }: { analytics: TicketAnalytics }) {
  const hours =
    analytics.totalResolvedHours > 0
      ? `${analytics.totalResolvedHours.toFixed(1).replace(/\.0$/, '')}h`
      : '0h'

  return (
    <MetricStrip
      className="ticket-analytics-strip"
      foldLabel="Ticket stats"
      items={[
        {
          label: 'Open now',
          value: String(analytics.openCount),
          accent: '#60a5fa',
        },
        {
          label: 'Resolved this week',
          value: String(analytics.resolvedThisWeek),
          accent: '#4ade80',
        },
        {
          label: 'Resolved this month',
          value: String(analytics.resolvedThisMonth),
          accent: '#4ade80',
        },
        {
          label: 'Avg turnaround',
          value: analytics.avgTurnaroundLabel,
          hint: 'Open → resolved',
          accent: '#fbbf24',
        },
        {
          label: 'Hours on resolved',
          value: hours,
          accent: 'var(--accent)',
        },
      ]}
    />
  )
}
