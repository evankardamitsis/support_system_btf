import Link from 'next/link'
import { PackageChip } from '@/components/retainers/PackageChip'
import { formatDate } from '@/lib/dates'

export type ClientListItem = {
  id: string
  name: string
  email: string
  contact_name: string | null
  plan_name: string | null
  renewal_date: string | null
  sla_response_hours: number
}

function initials(name: string) {
  const p = name.trim().split(' ')
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function ClientsList({ clients }: { clients: ClientListItem[] }) {
  if (clients.length === 0) {
    return (
      <div className="entity-panel dash-empty">
        <p className="dash-empty-title">No clients yet</p>
        <p className="dash-empty-hint">Add your first client to start tracking work.</p>
      </div>
    )
  }

  return (
    <div className="entity-panel anim-stagger-2">
      {clients.map(c => (
        <Link
          key={c.id}
          href={`/admin/clients/${c.id}`}
          className="entity-card anim-fade-up"
        >
          <div className="entity-card-main">
            <div className="entity-avatar" aria-hidden>
              {initials(c.name)}
            </div>
            <div className="entity-card-copy min-w-0">
              <p className="entity-card-title">{c.name}</p>
              <p className="entity-card-sub">{c.email}</p>
              {c.contact_name ? (
                <p className="entity-card-meta">{c.contact_name}</p>
              ) : null}
            </div>
          </div>

          <div className="entity-card-aside">
            {c.plan_name === 'Care' || c.plan_name === 'Grow' ? (
              <PackageChip
                packageName={c.plan_name === 'Grow' ? 'grow' : 'care'}
                className="entity-chip-package"
              />
            ) : (
              <span className="entity-chip">{c.plan_name ?? 'No package'}</span>
            )}
            <span className="entity-stat">
              <span className="entity-stat-label">Renewal</span>
              <span className="entity-stat-value tabular-nums">
                {formatDate(c.renewal_date)}
              </span>
            </span>
            <span className="entity-stat">
              <span className="entity-stat-label">SLA</span>
              <span className="entity-stat-value tabular-nums">{c.sla_response_hours ?? 8}h</span>
            </span>
            <span className="entity-card-arrow" aria-hidden>
              →
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
