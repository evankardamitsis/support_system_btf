'use client'

import type { ChannelPresenceSnapshot } from '@/lib/comms/channel-presence'
import { cn } from '@/lib/utils'

type OpsCommsChannelMetaProps = {
  presence: ChannelPresenceSnapshot
}

export function OpsCommsChannelMeta({ presence }: OpsCommsChannelMetaProps) {
  const onlineMembers = presence.members.filter(member => member.online)

  return (
    <span className="ops-comms-chat-channel-meta-wrap">
      <button
        type="button"
        className="ops-comms-chat-channel-meta-trigger"
        aria-expanded={false}
        aria-label={presence.metaTitle.replace('\n', '. ')}
      >
        <span className="ops-comms-chat-channel-meta-dots" aria-hidden>
          {onlineMembers.length > 0 ? (
            onlineMembers.slice(0, 4).map(member => (
              <span key={member.id} className="ops-comms-presence-dot is-online" />
            ))
          ) : (
            <span className="ops-comms-presence-dot" />
          )}
          {onlineMembers.length > 4 ? (
            <span className="ops-comms-chat-channel-meta-more">+{onlineMembers.length - 4}</span>
          ) : null}
        </span>
        <span className="ops-comms-chat-channel-meta-text">
          {presence.onlineCount > 0 ? `${presence.onlineCount} online` : 'No one online'}
          {presence.watchingLabel ? ` · ${presence.watchingLabel} viewing` : null}
        </span>
      </button>
      <span className="ops-comms-chat-channel-meta-details" role="tooltip">
        <span className="ops-comms-chat-channel-meta-details-section">
          <span className="ops-comms-chat-channel-meta-details-label">Can access</span>
          <span className="ops-comms-chat-channel-meta-details-list">
            {presence.members.map(member => (
              <span key={member.id} className="ops-comms-chat-channel-meta-details-item">
                <span
                  className={cn('ops-comms-presence-dot', member.online && 'is-online')}
                  aria-hidden
                />
                <span>{member.name}</span>
              </span>
            ))}
          </span>
        </span>
        <span className="ops-comms-chat-channel-meta-details-section">
          <span className="ops-comms-chat-channel-meta-details-label">Viewing now</span>
          <span className="ops-comms-chat-channel-meta-details-viewing">
            {presence.watching.length > 0
              ? presence.watching.map(watcher => watcher.name).join(', ')
              : 'No one is viewing this channel'}
          </span>
        </span>
      </span>
    </span>
  )
}
