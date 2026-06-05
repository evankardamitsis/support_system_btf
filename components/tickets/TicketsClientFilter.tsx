'use client'

export type ClientOption = { id: string; name: string }

export function TicketsClientFilter({
  value,
  clients,
  status,
  priority,
  assigned,
}: {
  value: string
  clients: ClientOption[]
  status?: string
  priority?: string
  assigned?: string
}) {
  return (
    <form method="GET" className="tickets-filter-form">
      {status ? <input type="hidden" name="status" value={status} /> : null}
      {priority ? <input type="hidden" name="priority" value={priority} /> : null}
      {assigned ? <input type="hidden" name="assigned" value={assigned} /> : null}
      <label htmlFor="client-filter" className="tickets-filter-label">
        Client
      </label>
      <select
        id="client-filter"
        name="client"
        defaultValue={value}
        className="dash-select dash-select--wide"
        onChange={e => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">All clients</option>
        {clients.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </form>
  )
}
