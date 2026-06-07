'use client'

import type { AssigneeOption } from './EditableAssigneeSelect'

export function TicketsAssigneeFilter({
  value,
  status,
  priority,
  client,
  staff,
  showResolved,
}: {
  value: string
  status?: string
  priority?: string
  client?: string
  staff: AssigneeOption[]
  showResolved?: boolean
}) {
  return (
    <form method="GET" className="tickets-filter-form">
      {status ? <input type="hidden" name="status" value={status} /> : null}
      {priority ? <input type="hidden" name="priority" value={priority} /> : null}
      {client ? <input type="hidden" name="client" value={client} /> : null}
      {showResolved ? <input type="hidden" name="showResolved" value="1" /> : null}
      <label htmlFor="assignee-filter" className="tickets-filter-label">
        Assigned
      </label>
      <select
        id="assignee-filter"
        name="assigned"
        defaultValue={value}
        className="dash-select"
        onChange={e => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">All</option>
        <option value="me">Assigned to me</option>
        <option value="unassigned">Unassigned</option>
        {staff.map(member => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </form>
  )
}
