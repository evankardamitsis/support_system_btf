'use client'

import { ExternalLink, StickyNote } from 'lucide-react'
import { MessageUI, useMessageContext } from 'stream-chat-react'
import type { MessageUIComponentProps } from 'stream-chat-react'
import { isHuddleChatLogText } from '@/lib/comms/huddle-chat-log'
import { copyCommsMessageToNote } from '@/lib/comms/use-comms-send-handler'
import { cn } from '@/lib/utils'

type OpsCommsMessageUIProps = MessageUIComponentProps & {
  ticketId?: string | null
}

export function OpsCommsMessageUI({ ticketId, ...props }: OpsCommsMessageUIProps) {
  const { message } = useMessageContext('OpsCommsMessageUI')
  const text = message.text?.trim() ?? ''
  const showTicketActions = Boolean(ticketId && text && message.type !== 'system' && !message.deleted_at)
  const huddleLog = isHuddleChatLogText(text)

  return (
    <div
      className={cn('ops-comms-message-wrap', huddleLog && 'ops-comms-message-wrap--huddle-log')}
    >
      <MessageUI {...props} />
      {showTicketActions ? (
        <div className="ops-comms-message-actions">
          <button
            type="button"
            className="ops-comms-message-action"
            title="Copy to internal note"
            onClick={() => void copyCommsMessageToNote(ticketId!, text)}
          >
            <StickyNote aria-hidden />
            <span>Note</span>
          </button>
          <a
            className="ops-comms-message-action"
            href={`/admin/tickets/${ticketId}`}
            title="Open ticket"
          >
            <ExternalLink aria-hidden />
            <span>Ticket</span>
          </a>
        </div>
      ) : null}
    </div>
  )
}
