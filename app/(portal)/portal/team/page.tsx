import { PageHeader } from '@/components/dashboard/PageHeader'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { ClientTeamList } from '@/components/client-team/ClientTeamList'
import { InviteClientTeamForm } from '@/components/client-team/InviteClientTeamForm'
import { getClientTeamDirectory } from '@/app/actions/client-team'

export default async function PortalTeamPage() {
  const { clientName, primaryContactEmail, members, pendingInvites, error: loadError } =
    await getClientTeamDirectory()

  return (
    <div className="space-y-5 w-full">
      <PageHeader
        title="Team"
        description={
          clientName
            ? `People at ${clientName} with access to your support portal.`
            : 'People with access to your support portal.'
        }
      />

      {loadError ? (
        <p className="ticket-modal-error leading-relaxed">{loadError}</p>
      ) : (
        <MetricStrip
          foldLabel="Team"
          items={[
            { label: 'Active', value: String(members.length) },
            {
              label: 'Pending invites',
              value: String(pendingInvites.length),
              accent: pendingInvites.length > 0 ? '#fb923c' : undefined,
            },
            {
              label: 'Notifications',
              value: 'Main contact',
            },
          ]}
        />
      )}

      <InviteClientTeamForm />

      <ClientTeamList
        members={members}
        pendingInvites={pendingInvites}
        primaryContactEmail={primaryContactEmail}
      />
    </div>
  )
}
