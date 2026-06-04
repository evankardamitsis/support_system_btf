'use client'

export function TicketsPriorityFilter({
  value,
  status,
}: {
  value: string
  status?: string
}) {
  return (
    <form method="GET" className="flex items-center gap-2">
      {status ? <input type="hidden" name="status" value={status} /> : null}
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
