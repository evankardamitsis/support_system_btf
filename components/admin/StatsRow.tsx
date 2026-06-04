import { Ticket, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface StatsRowProps {
  open: number
  inProgress: number
  critical: number
  resolved: number
}

const cards = [
  { key: 'open', label: 'Open', icon: Ticket, color: '#60a5fa', delay: 'anim-fade-up-1' },
  { key: 'inProgress', label: 'In Progress', icon: Zap, color: '#fbbf24', delay: 'anim-fade-up-2' },
  { key: 'critical', label: 'Critical', icon: AlertTriangle, color: '#f87171', delay: 'anim-fade-up-3' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, color: '#4ade80', delay: 'anim-fade-up-4' },
] as const

export function StatsRow({ open, inProgress, critical, resolved }: StatsRowProps) {
  const values = { open, inProgress, critical, resolved }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'var(--border)' }}>
      {cards.map(({ key, label, icon: Icon, color, delay }) => (
        <div
          key={key}
          className={`anim-fade-up ${delay} dash-stat-card stat-card`}
          style={{ ['--stat-accent' as string]: color, background: 'var(--surface)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-3xl font-bold leading-none tabular-nums"
                style={{ color, fontFamily: 'var(--font-dm-mono)' }}
              >
                {values[key]}
              </p>
              <p className="dash-stat-label mt-2">{label}</p>
            </div>
            <Icon size={15} style={{ color, opacity: 0.45, marginTop: 2, flexShrink: 0 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
