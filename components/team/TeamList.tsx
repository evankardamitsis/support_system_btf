import { formatStaffRole, type StaffRole } from '@/lib/team/roles'
import { PendingInviteActions } from '@/components/team/PendingInviteActions'

export type TeamMember = {
  id: string
  email: string
  full_name: string | null
  role: StaffRole
  created_at: string
}

export type PendingInvite = {
  id: string
  email: string
  full_name: string
  role: StaffRole
  expires_at: string
  invite_url: string
}

function initials(name: string) {
  const p = name.trim().split(' ')
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?'
}

function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <span className={`team-role-badge team-role-badge--${role}`}>{formatStaffRole(role)}</span>
  )
}

export function TeamList({
  members,
  pendingInvites,
  canManageInvites = false,
}: {
  members: TeamMember[]
  pendingInvites: PendingInvite[]
  canManageInvites?: boolean
}) {
  if (members.length === 0 && pendingInvites.length === 0) {
    return (
      <div className="entity-panel dash-empty">
        <p className="dash-empty-title">No team members yet</p>
        <p className="dash-empty-hint">Invite an admin or member to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 anim-stagger-2">
      {members.length > 0 ? (
        <div className="entity-panel">
          <p className="team-section-label">Active</p>
          {members.map(m => (
            <div key={m.id} className="entity-card entity-card--static anim-fade-up">
              <div className="entity-card-main">
                <div className="entity-avatar" aria-hidden>
                  {initials(m.full_name ?? m.email)}
                </div>
                <div className="entity-card-copy min-w-0">
                  <p className="entity-card-title">{m.full_name ?? 'Unnamed'}</p>
                  <p className="entity-card-sub">{m.email}</p>
                </div>
              </div>
              <div className="entity-card-aside">
                <RoleBadge role={m.role} />
                <span className="entity-stat">
                  <span className="entity-stat-label">Joined</span>
                  <span className="entity-stat-value tabular-nums">
                    {new Date(m.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {pendingInvites.length > 0 ? (
        <div className="entity-panel team-pending-panel">
          <p className="team-section-label">Pending invites</p>
          {pendingInvites.map(inv => (
            <div key={inv.id} className="entity-card entity-card--static anim-fade-up">
              <div className="entity-card-main">
                <div className="entity-avatar entity-avatar--pending" aria-hidden>
                  {initials(inv.full_name)}
                </div>
                <div className="entity-card-copy min-w-0">
                  <p className="entity-card-title">{inv.full_name}</p>
                  <p className="entity-card-sub">{inv.email}</p>
                </div>
              </div>
              <div className="entity-card-aside team-pending-aside">
                <RoleBadge role={inv.role} />
                <span className="entity-stat">
                  <span className="entity-stat-label">Expires</span>
                  <span className="entity-stat-value tabular-nums">
                    {new Date(inv.expires_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </span>
                {canManageInvites ? (
                  <PendingInviteActions inviteId={inv.id} inviteUrl={inv.invite_url} />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
