'use client'

import {
  inviteClientTeamMemberAsAdmin,
  resendClientTeamInviteAsAdmin,
  revokeClientInviteAsAdmin,
} from '@/app/actions/client-team'
import { ClientTeamList } from '@/components/client-team/ClientTeamList'
import { InviteClientTeamForm } from '@/components/client-team/InviteClientTeamForm'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import type { ClientTeamDirectoryResult } from '@/lib/client-team/action-results'

export function AdminClientTeamPanel({
  clientId,
  directory,
}: {
  clientId: string
  directory: ClientTeamDirectoryResult
}) {
  const { members, pendingInvites, primaryContactEmail, error } = directory

  return (
    <section className="space-y-5 anim-fade-up anim-fade-up-4">
      <div>
        <h2 className="dash-section-title">Portal team</h2>
        <p className="dash-meta mt-1 leading-relaxed">
          Invite people to this client&apos;s support portal. They receive an email with a link to
          create their account.
        </p>
      </div>

      {error ? <p className="ticket-modal-error leading-relaxed">{error}</p> : null}

      {!error ? (
        <MetricStrip
          foldLabel="Portal team"
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
      ) : null}

      <InviteClientTeamForm
        title="Invite to portal"
        description="Send a portal invite by email. Include the main contact or any teammate — they choose a password and get access to tickets and retainer info for this client."
        inviteAction={formData => inviteClientTeamMemberAsAdmin(clientId, formData)}
      />

      <ClientTeamList
        members={members}
        pendingInvites={pendingInvites}
        primaryContactEmail={primaryContactEmail}
        resendInviteAction={inviteId => resendClientTeamInviteAsAdmin(clientId, inviteId)}
        revokeInviteAction={inviteId => revokeClientInviteAsAdmin(clientId, inviteId)}
      />
    </section>
  )
}
