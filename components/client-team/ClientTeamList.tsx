import type { ClientPendingInvite, ClientTeamMember } from '@/lib/client-team/action-results'
import { PendingClientInviteActions } from '@/components/client-team/PendingClientInviteActions'

function initials(name: string) {
  const p = name.trim().split(' ')
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function ClientTeamList({
  members,
  pendingInvites,
  primaryContactEmail,
}: {
  members: ClientTeamMember[]
  pendingInvites: ClientPendingInvite[]
  primaryContactEmail: string
}) {
  if (members.length === 0 && pendingInvites.length === 0) {
    return (
      <div className="entity-panel dash-empty">
        <p className="dash-empty-title">No teammates yet</p>
        <p className="dash-empty-hint">
          Invite colleagues by email — they get a link to create their portal account.
        </p>
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
                {m.is_primary_contact ? (
                  <span className="team-role-badge team-role-badge--admin">Main contact</span>
                ) : (
                  <span className="team-role-badge team-role-badge--agent">Teammate</span>
                )}
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

      {primaryContactEmail ? (
        <p className="dash-meta leading-relaxed px-1">
          Notification emails go to{' '}
          <span className="text-(--text-1)">{primaryContactEmail}</span> only — not all teammates.
        </p>
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
                <span className="team-role-badge team-role-badge--agent">Invited</span>
                <span className="entity-stat">
                  <span className="entity-stat-label">Expires</span>
                  <span className="entity-stat-value tabular-nums">
                    {new Date(inv.expires_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </span>
                <PendingClientInviteActions inviteId={inv.id} inviteUrl={inv.invite_url} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
