export type TicketListFilters = {
  status?: string
  priority?: string
  client?: string
  assigned?: string
  showResolved?: string
}

export function isResolvedQueueStatus(status: string) {
  return status === 'resolved' || status === 'closed'
}

export function ticketsListHref(basePath: string, filters: TicketListFilters) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.client) params.set('client', filters.client)
  if (filters.assigned) params.set('assigned', filters.assigned)
  if (filters.showResolved) params.set('showResolved', filters.showResolved)
  const q = params.toString()
  return q ? `${basePath}?${q}` : basePath
}
