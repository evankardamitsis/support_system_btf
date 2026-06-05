'use client'

export function TicketsPriorityFilter({
  value,
  status,
  client,
  assigned,
}: {
  value: string
  status?: string
  client?: string
  assigned?: string
}) {
  return (
    <form method="GET" className="tickets-filter-form">
      {status ? <input type="hidden" name="status" value={status} /> : null}
      {client ? <input type="hidden" name="client" value={client} /> : null}
      {assigned ? <input type="hidden" name="assigned" value={assigned} /> : null}
      <label htmlFor="priority-filter" className="tickets-filter-label">
        Priority
      </label>
      <select
        id="priority-filter"
        name="priority"
        defaultValue={value}
        className="dash-select"
        onChange={e => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">All</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="normal">Normal</option>
        <option value="low">Low</option>
      </select>
    </form>
  )
}
