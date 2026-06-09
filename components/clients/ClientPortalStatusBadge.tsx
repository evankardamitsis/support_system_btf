import { formatDate } from '@/lib/dates'
import type { ClientPortalRegistrationStatus } from '@/lib/clients/portal-registration'

export function ClientPortalStatusBadge({
  status,
}: {
  status: ClientPortalRegistrationStatus
}) {
  if (status.state === 'registered') {
    const title = status.name
      ? `${status.name} registered on ${formatDate(status.registeredAt)}`
      : `Registered on ${formatDate(status.registeredAt)}`

    return (
      <span className="client-portal-badge client-portal-badge--registered" title={title}>
        Portal registered
      </span>
    )
  }

  if (status.state === 'pending') {
    return (
      <span className="client-portal-badge client-portal-badge--pending" title="Invite sent — awaiting signup">
        Invite pending
      </span>
    )
  }

  return (
    <span className="client-portal-badge client-portal-badge--inactive" title="Main contact has not completed portal signup">
      Not on portal
    </span>
  )
}
