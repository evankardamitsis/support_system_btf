import { Ticket, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface StatCard {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
  delay: string
}

interface StatsRowProps {
  open: number
  inProgress: number
  critical: number
  resolved: number
}

export function StatsRow({ open, inProgress, critical, resolved }: StatsRowProps) {
  const cards: StatCard[] = [
    {
      label: 'Open',
      value: open,
      icon: <Ticket size={16} />,
      color: '#2563eb',
      bgColor: '#eff6ff',
      delay: 'anim-fade-up-1',
    },
    {
      label: 'In Progress',
      value: inProgress,
      icon: <Zap size={16} />,
      color: '#d97706',
      bgColor: '#fffbeb',
      delay: 'anim-fade-up-2',
    },
    {
      label: 'Critical',
      value: critical,
      icon: <AlertTriangle size={16} />,
      color: '#dc2626',
      bgColor: '#fef2f2',
      delay: 'anim-fade-up-3',
    },
    {
      label: 'Resolved',
      value: resolved,
      icon: <CheckCircle2 size={16} />,
      color: '#16a34a',
      bgColor: '#f0fdf4',
      delay: 'anim-fade-up-4',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon, color, bgColor, delay }) => (
        <div
          key={label}
          className={`stat-card anim-fade-up ${delay} relative overflow-hidden rounded-xl bg-white p-5 cursor-default`}
          style={{ border: '1px solid #f0f0ee', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          {/* Accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: color, opacity: 0.6 }}
          />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">
                {value}
              </p>
              <p className="text-sm text-gray-500 mt-1.5 font-medium">{label}</p>
            </div>
            <div
              className="p-2 rounded-lg"
              style={{ background: bgColor, color }}
            >
              {icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
