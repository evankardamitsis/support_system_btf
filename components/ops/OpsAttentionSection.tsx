'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { OpsAttentionItem } from '@/lib/ops/dashboard/service'

type AttentionFilter = 'all' | OpsAttentionItem['kind']

const FILTER_LABELS: Record<AttentionFilter, string> = {
  all: 'All',
  hosting: 'Hosting',
  task: 'Tasks',
  project: 'Projects',
  offer: 'Offers',
}

function attentionToneClass(tone: 'danger' | 'warn' | 'info') {
  return `ops-attention-item ops-attention-item--${tone}`
}

export function OpsAttentionSection({
  items,
  isAdmin,
}: {
  items: OpsAttentionItem[]
  isAdmin: boolean
}) {
  const [filter, setFilter] = useState<AttentionFilter>('all')

  const attentionRules = isAdmin
    ? 'Hosting renewals (14d / 30d) · expired hosting · overdue & due-soon tasks · projects past target · unassigned tasks · open offers not emailed · accepted offers without project'
    : 'Hosting renewals (14d / 30d) · expired hosting · open offers not emailed'

  const filterOptions = useMemo(() => {
    const kinds = new Set(items.map(item => item.kind))
    const options: AttentionFilter[] = ['all']
    if (kinds.has('hosting')) options.push('hosting')
    if (isAdmin && kinds.has('task')) options.push('task')
    if (isAdmin && kinds.has('project')) options.push('project')
    if (kinds.has('offer')) options.push('offer')
    return options
  }, [items, isAdmin])

  const filteredItems = useMemo(
    () => (filter === 'all' ? items : items.filter(item => item.kind === filter)),
    [filter, items]
  )

  return (
    <section className="ops-dashboard-panel">
      <div className="ops-dashboard-panel-head ops-dashboard-panel-head--stacked">
        <div>
          <h2 className="dash-section-title">Needs attention</h2>
          <p className="ops-dashboard-attention-rules">{attentionRules}</p>
        </div>
        <span className="ops-dashboard-panel-meta">
          {filteredItems.length}
          {filter !== 'all' ? ` of ${items.length}` : ''} items
        </span>
      </div>

      {filterOptions.length > 1 ? (
        <div className="ops-attention-filters" role="tablist" aria-label="Filter attention items">
          {filterOptions.map(option => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={filter === option}
              className={`ops-attention-filter${filter === option ? ' ops-attention-filter--active' : ''}`}
              onClick={() => setFilter(option)}
            >
              {FILTER_LABELS[option]}
            </button>
          ))}
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="dash-empty ops-dashboard-empty">
          <p className="dash-empty-title">{items.length === 0 ? 'All clear' : 'No matches'}</p>
          <p className="dash-empty-hint">
            {items.length === 0
              ? 'No overdue tasks, renewals, or open follow-ups right now.'
              : 'Try another filter to see other attention items.'}
          </p>
        </div>
      ) : (
        <ul className="ops-attention-list">
          {filteredItems.map(item => (
            <li key={item.id}>
              <Link href={item.href} className={attentionToneClass(item.tone)}>
                <div className="ops-attention-copy">
                  <span className="ops-attention-kind">{item.kind}</span>
                  <span className="ops-attention-title">{item.title}</span>
                  <span className="ops-attention-meta">{item.meta}</span>
                </div>
                <ChevronRight size={16} className="ops-attention-chevron" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
