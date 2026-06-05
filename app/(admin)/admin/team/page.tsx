import { PageHeader } from '@/components/dashboard/PageHeader'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { TeamList } from '@/components/team/TeamList'
import { InviteTeamForm } from '@/components/team/InviteTeamForm'
import { getTeamDirectory } from '@/app/actions/team'
import { requireAdmin } from '@/lib/auth/require-admin'

export default async function AdminTeamPage() {
  const { isAdmin } = await requireAdmin()
  const { members, pendingInvites, error: loadError } = await getTeamDirectory()

  const adminCount = members.filter(m => m.role === 'admin').length
  const memberCount = members.filter(m => m.role === 'agent').length

  return (
    <div className="space-y-5 w-full">
      <PageHeader
        title="Team"
        description="BTF internal admins and members with access to the support dashboard."
      />

      {loadError ? (
        <p className="ticket-modal-error leading-relaxed">{loadError}</p>
      ) : (
        <MetricStrip
          items={[
            { label: 'Admins', value: String(adminCount) },
            { label: 'Members', value: String(memberCount) },
            {
              label: 'Pending invites',
              value: String(pendingInvites.length),
              accent: pendingInvites.length > 0 ? '#fb923c' : undefined,
            },
          ]}
        />
      )}

      {isAdmin ? (
        <InviteTeamForm />
      ) : (
        <p className="dash-meta leading-relaxed">
          Only admins can invite new team members. Contact an admin if someone needs access.
        </p>
      )}

      <TeamList
        members={members}
        pendingInvites={pendingInvites}
        canManageInvites={isAdmin}
      />
    </div>
  )
}
