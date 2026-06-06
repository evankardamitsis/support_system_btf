'use client'

import { useMemo } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
} from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'

export type AgentPlanStatus =
  | 'done'
  | 'in_progress'
  | 'review'
  | 'backlog'
  | 'pending'
  | 'completed'
  | 'need-help'
  | 'failed'
  | string

export type AgentPlanBadge = {
  key: string
  label: string
  tone?: 'default' | 'accent' | 'warn' | 'danger'
}

export type AgentPlanChildItem = {
  id: string
  title: string
  description?: string | null
  status: AgentPlanStatus
  statusLabel: string
  badges?: AgentPlanBadge[]
  trailing?: React.ReactNode
  details?: React.ReactNode
  actions?: React.ReactNode
}

export type AgentPlanItem = {
  id: string
  title: string
  description?: string | null
  status: AgentPlanStatus
  statusLabel: string
  badges?: AgentPlanBadge[]
  trailing?: React.ReactNode
  details?: React.ReactNode
  actions?: React.ReactNode
  children?: AgentPlanChildItem[]
  footer?: React.ReactNode
}

export type AgentPlanGroup = {
  id: string
  title: string
  statusLabel?: string
  statusTone?: AgentPlanStatus
  progress?: { done: number; total: number }
  headerExtra?: React.ReactNode
  items: AgentPlanItem[]
  emptyLabel?: string
}

export type AgentPlanProps = {
  groups: AgentPlanGroup[]
  expandedGroups: string[]
  onToggleGroup: (groupId: string) => void
  expandedItems: Record<string, boolean>
  onToggleItem: (groupId: string, itemId: string) => void
  onStatusClick: (groupId: string, itemId: string, childId?: string) => void
  onItemOpen: (itemId: string) => void
  disabled?: boolean
}

function itemKey(groupId: string, itemId: string) {
  return `${groupId}:${itemId}`
}

function itemHasExpandableBody(item: AgentPlanItem) {
  return Boolean(
    item.description ||
      item.details ||
      item.footer ||
      (item.children && item.children.length > 0)
  )
}

function StatusIcon({ status, size = 'md' }: { status: AgentPlanStatus; size?: 'md' | 'sm' }) {
  const className = size === 'sm' ? 'ops-agent-plan-icon ops-agent-plan-icon--sm' : 'ops-agent-plan-icon'
  if (status === 'done' || status === 'completed') {
    return <CheckCircle2 className={`${className} ops-agent-plan-icon--done`} aria-hidden />
  }
  if (status === 'in_progress') {
    return <CircleDotDashed className={`${className} ops-agent-plan-icon--progress`} aria-hidden />
  }
  if (status === 'review' || status === 'need-help') {
    return <CircleAlert className={`${className} ops-agent-plan-icon--review`} aria-hidden />
  }
  if (status === 'failed') {
    return <CircleX className={`${className} ops-agent-plan-icon--failed`} aria-hidden />
  }
  return <Circle className={`${className} ops-agent-plan-icon--pending`} aria-hidden />
}

function StatusBadge({ label, status }: { label: string; status: AgentPlanStatus }) {
  return (
    <motion.span
      className={`ops-agent-plan-badge ops-agent-plan-badge--${status}`}
      initial={{ scale: 1 }}
      animate={{ scale: 1 }}
      key={label}
    >
      {label}
    </motion.span>
  )
}

function BadgeList({ badges }: { badges?: AgentPlanBadge[] }) {
  if (!badges?.length) return null
  return (
    <div className="ops-agent-plan-badges">
      {badges.map(badge => (
        <span
          key={badge.key}
          className={`ops-agent-plan-chip${badge.tone ? ` ops-agent-plan-chip--${badge.tone}` : ''}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  )
}

export function AgentPlan({
  groups,
  expandedGroups,
  onToggleGroup,
  expandedItems,
  onToggleItem,
  onStatusClick,
  onItemOpen,
  disabled = false,
}: AgentPlanProps) {
  const prefersReducedMotion = useReducedMotion() ?? false

  const taskVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: prefersReducedMotion ? 0 : -5 },
      visible: {
        opacity: 1,
        y: 0,
        transition: prefersReducedMotion
          ? { type: 'tween' as const, duration: 0.2 }
          : { type: 'spring' as const, stiffness: 500, damping: 30 },
      },
    }),
    [prefersReducedMotion]
  )

  const subtaskVariants = useMemo(
    () => ({
      hidden: { opacity: 0, x: prefersReducedMotion ? 0 : -10 },
      visible: {
        opacity: 1,
        x: 0,
        transition: prefersReducedMotion
          ? { type: 'tween' as const, duration: 0.2 }
          : { type: 'spring' as const, stiffness: 500, damping: 25 },
      },
    }),
    [prefersReducedMotion]
  )

  return (
    <motion.div
      className="ops-agent-plan"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
    >
      <LayoutGroup>
        <div className="ops-agent-plan-body">
          <ul className="ops-agent-plan-groups">
            {groups.map((group, index) => {
              const isExpanded = expandedGroups.includes(group.id)
              const progressPct =
                group.progress && group.progress.total > 0
                  ? Math.round((group.progress.done / group.progress.total) * 100)
                  : 0

              return (
                <motion.li
                  key={group.id}
                  className={`ops-agent-plan-group${index !== 0 ? ' ops-agent-plan-group--spaced' : ''}`}
                  initial="hidden"
                  animate="visible"
                  variants={taskVariants}
                >
                  <div className="ops-agent-plan-group-head">
                    <motion.button
                      type="button"
                      className="ops-agent-plan-group-toggle"
                      onClick={() => onToggleGroup(group.id)}
                      aria-expanded={isExpanded}
                    >
                      <ChevronDown
                        size={14}
                        className={`ops-agent-plan-chevron${isExpanded ? '' : ' ops-agent-plan-chevron--collapsed'}`}
                        aria-hidden
                      />
                      <span className="ops-agent-plan-group-title">{group.title}</span>
                      {group.progress ? (
                        <span className="ops-agent-plan-group-progress tabular-nums">
                          {group.progress.done}/{group.progress.total}
                        </span>
                      ) : null}
                      {group.statusLabel ? (
                        <StatusBadge label={group.statusLabel} status={group.statusTone ?? 'pending'} />
                      ) : null}
                    </motion.button>
                    {group.headerExtra ? (
                      <div className="ops-agent-plan-group-extra">{group.headerExtra}</div>
                    ) : null}
                    {group.progress ? (
                      <div className="ops-agent-plan-group-progress-bar" aria-hidden>
                        <div
                          className="ops-agent-plan-group-progress-fill"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={`ops-agent-plan-collapse${isExpanded ? ' ops-agent-plan-collapse--open' : ' ops-agent-plan-collapse--closed'}`}
                  >
                    <div className="ops-agent-plan-collapse-inner">
                      <div className="ops-agent-plan-items-wrap">
                        {group.items.length === 0 ? (
                          <p className="ops-agent-plan-empty">{group.emptyLabel ?? 'No tasks yet'}</p>
                        ) : (
                          <ul className="ops-agent-plan-items">
                            <div className="ops-agent-plan-connector" aria-hidden />
                            {group.items.map(item => {
                              const expanded = expandedItems[itemKey(group.id, item.id)] ?? false
                              const isDone = item.status === 'done'
                              const canExpand = itemHasExpandableBody(item)
                              const childCount = item.children?.length ?? 0

                              return (
                                <motion.li
                                  key={item.id}
                                  className="ops-agent-plan-item"
                                  variants={subtaskVariants}
                                  layout={!prefersReducedMotion}
                                >
                                  <div className="ops-agent-plan-item-row">
                                    <motion.button
                                      type="button"
                                      className="ops-agent-plan-status-btn"
                                      disabled={disabled}
                                      onClick={e => {
                                        e.stopPropagation()
                                        onStatusClick(group.id, item.id)
                                      }}
                                      whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                                    >
                                      <AnimatePresence mode="wait" initial={false}>
                                        <motion.span
                                          key={item.status}
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.8 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <StatusIcon status={item.status} />
                                        </motion.span>
                                      </AnimatePresence>
                                    </motion.button>

                                    <div className="ops-agent-plan-item-main">
                                      <div className="ops-agent-plan-item-title-row">
                                        <button
                                          type="button"
                                          className="ops-agent-plan-item-title-btn"
                                          onClick={() => canExpand && onToggleItem(group.id, item.id)}
                                          aria-expanded={canExpand ? expanded : undefined}
                                          disabled={!canExpand}
                                        >
                                          {canExpand ? (
                                            <ChevronDown
                                              size={13}
                                              className={`ops-agent-plan-chevron ops-agent-plan-chevron--item${expanded ? '' : ' ops-agent-plan-chevron--collapsed'}`}
                                              aria-hidden
                                            />
                                          ) : null}
                                          <span
                                            className={`ops-agent-plan-item-title${isDone ? ' ops-agent-plan-item-title--done' : ''}`}
                                          >
                                            {item.title}
                                          </span>
                                        </button>
                                        {item.trailing ? (
                                          <div
                                            className="ops-agent-plan-item-trailing"
                                            onClick={e => e.stopPropagation()}
                                          >
                                            {item.trailing}
                                          </div>
                                        ) : null}
                                      </div>
                                      {(!expanded && childCount > 0) ||
                                      (item.badges && item.badges.length > 0) ? (
                                        <div className="ops-agent-plan-item-meta">
                                          {!expanded && childCount > 0 ? (
                                            <span className="ops-agent-plan-chip">
                                              {childCount} subtask{childCount === 1 ? '' : 's'}
                                            </span>
                                          ) : null}
                                          <BadgeList badges={item.badges} />
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className="ops-agent-plan-item-side">
                                      {item.actions}
                                      <button
                                        type="button"
                                        className="ops-agent-plan-open-btn"
                                        onClick={() => onItemOpen(item.id)}
                                      >
                                        Open
                                      </button>
                                    </div>
                                  </div>

                                  <div
                                    className={`ops-agent-plan-collapse ops-agent-plan-collapse--nested${expanded ? ' ops-agent-plan-collapse--open' : ' ops-agent-plan-collapse--closed'}`}
                                  >
                                    <div className="ops-agent-plan-collapse-inner">
                                      {item.description || item.details ? (
                                        <div className="ops-agent-plan-item-details">
                                          {item.description ? (
                                            <p className="ops-agent-plan-description">{item.description}</p>
                                          ) : null}
                                          {item.details}
                                        </div>
                                      ) : null}

                                      {item.children && item.children.length > 0 ? (
                                        <ul className="ops-agent-plan-children">
                                          {item.children.map(child => {
                                            const childDone = child.status === 'done'
                                            const childExpanded =
                                              expandedItems[
                                                itemKey(group.id, `${item.id}:${child.id}`)
                                              ] ?? false
                                            const childCanExpand = Boolean(
                                              child.description || child.details
                                            )

                                            return (
                                              <motion.li
                                                key={child.id}
                                                className="ops-agent-plan-child"
                                                layout={!prefersReducedMotion}
                                              >
                                            <div className="ops-agent-plan-child-row">
                                              <motion.button
                                                type="button"
                                                className="ops-agent-plan-status-btn"
                                                disabled={disabled}
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  onStatusClick(group.id, item.id, child.id)
                                                }}
                                                whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                                              >
                                                <StatusIcon status={child.status} size="sm" />
                                              </motion.button>
                                              <div className="ops-agent-plan-child-main">
                                                <div className="ops-agent-plan-item-title-row">
                                                  <button
                                                    type="button"
                                                    className="ops-agent-plan-item-title-btn"
                                                    onClick={() =>
                                                      childCanExpand &&
                                                      onToggleItem(group.id, `${item.id}:${child.id}`)
                                                    }
                                                    aria-expanded={
                                                      childCanExpand ? childExpanded : undefined
                                                    }
                                                    disabled={!childCanExpand}
                                                  >
                                                    {childCanExpand ? (
                                                      <ChevronDown
                                                        size={12}
                                                        className={`ops-agent-plan-chevron ops-agent-plan-chevron--item${childExpanded ? '' : ' ops-agent-plan-chevron--collapsed'}`}
                                                        aria-hidden
                                                      />
                                                    ) : null}
                                                    <span
                                                      className={`ops-agent-plan-child-title${childDone ? ' ops-agent-plan-item-title--done' : ''}`}
                                                    >
                                                      {child.title}
                                                    </span>
                                                  </button>
                                                  {child.trailing ? (
                                                    <div
                                                      className="ops-agent-plan-item-trailing"
                                                      onClick={e => e.stopPropagation()}
                                                    >
                                                      {child.trailing}
                                                    </div>
                                                  ) : null}
                                                </div>
                                                {child.badges && child.badges.length > 0 ? (
                                                  <div className="ops-agent-plan-item-meta">
                                                    <BadgeList badges={child.badges} />
                                                  </div>
                                                ) : null}
                                              </div>
                                              <div className="ops-agent-plan-item-side">
                                                {child.actions}
                                                <button
                                                  type="button"
                                                  className="ops-agent-plan-open-btn"
                                                  onClick={() => onItemOpen(child.id)}
                                                >
                                                  Open
                                                </button>
                                              </div>
                                            </div>
                                            <div
                                              className={`ops-agent-plan-collapse ops-agent-plan-collapse--nested${childExpanded ? ' ops-agent-plan-collapse--open' : ' ops-agent-plan-collapse--closed'}`}
                                            >
                                              <div className="ops-agent-plan-collapse-inner">
                                                {child.description || child.details ? (
                                                  <div className="ops-agent-plan-child-details">
                                                    {child.description ? (
                                                      <p className="ops-agent-plan-description">
                                                        {child.description}
                                                      </p>
                                                    ) : null}
                                                    {child.details}
                                                  </div>
                                                ) : null}
                                              </div>
                                            </div>
                                          </motion.li>
                                        )
                                      })}
                                    </ul>
                                      ) : null}

                                      {item.footer}
                                    </div>
                                  </div>
                                </motion.li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </div>
      </LayoutGroup>
    </motion.div>
  )
}
