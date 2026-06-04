export type TicketListFilters = {
  status?: string
  priority?: string
  client?: string
}

export function ticketsListHref(basePath: string, filters: TicketListFilters) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.client) params.set('client', filters.client)
  const q = params.toString()
  return q ? `${basePath}?${q}` : basePath
}
