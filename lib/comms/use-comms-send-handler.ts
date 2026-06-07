'use client'

import { useCallback } from 'react'
import type { Channel, Message, SendMessageOptions } from 'stream-chat'
import type { StreamStaffMember } from '@/lib/comms/stream-server'
import { ticketIdFromChannelId, commsChannelKind } from '@/lib/comms/stream-channels'
import {
  COMMS_SLASH_HELP,
  parseSlashCommand,
} from '@/lib/comms/slash-commands'
import { enrichCommsMentions } from '@/lib/comms/mention-utils'
import {
  commsAssignTicket,
  commsCopyMessageToInternalNote,
  commsCreateReminder,
  commsLookupTicket,
  commsNotifyMentions,
  commsSetTicketStatus,
} from '@/app/actions/comms'
import { notifyError } from '@/lib/notify'

type UseCommsSendHandlerOptions = {
  channel: Channel
  staff: StreamStaffMember[]
  currentUserId: string
  currentUserName: string
  channelId: string
  channelLabel: string
  assigneeId?: string | null
  assigneeName?: string | null
  onlineMemberIds: string[]
  onOpenTicketChannel: (channelId: string) => void
  onStartHuddle: () => void
  huddleEnabled: boolean
  onAssigneeChanged?: () => void
}

type SlashResult = {
  handled: boolean
  feedback?: string
}

async function openTicketChannel(ticketRef: string, onOpen: (channelId: string) => void) {
  const ticket = await commsLookupTicket(ticketRef)
  if (!ticket) {
    notifyError('Ticket not found')
    return { handled: true, feedback: 'Ticket not found.' }
  }

  const response = await fetch(`/api/comms/channels/ticket/${ticket.id}`, { method: 'POST' })
  const body = (await response.json().catch(() => null)) as
    | { channelId?: string; error?: string }
    | null

  if (!response.ok || !body?.channelId) {
    notifyError(body?.error ?? 'Could not open ticket chat')
    return { handled: true, feedback: body?.error ?? 'Could not open ticket chat.' }
  }

  onOpen(body.channelId)
  return {
    handled: true,
    feedback: `Opened ${ticket.displayId} · ${ticket.title}`,
  }
}

export function useCommsSendHandler(options: UseCommsSendHandlerOptions) {
  const { channel } = options
  const ticketId = ticketIdFromChannelId(options.channelId)

  const runSlashCommand = useCallback(
    async (text: string): Promise<SlashResult> => {
      const parsed = parseSlashCommand(text)
      if (!parsed) return { handled: false }

      try {
        switch (parsed.name) {
          case 'help':
            return { handled: true, feedback: COMMS_SLASH_HELP }

          case 'ticket':
            if (!parsed.args) {
              return { handled: true, feedback: 'Usage: /ticket TKT-1234' }
            }
            return openTicketChannel(parsed.args, options.onOpenTicketChannel)

          case 'assign': {
            if (!ticketId) {
              return { handled: true, feedback: '/assign only works in ticket chats.' }
            }
            const assigneeArg = parsed.args || 'me'
            const result = await commsAssignTicket(ticketId, assigneeArg)
            options.onAssigneeChanged?.()
            return { handled: true, feedback: `Assigned to ${result.assigneeName}.` }
          }

          case 'status': {
            if (!ticketId) {
              return { handled: true, feedback: '/status only works in ticket chats.' }
            }
            if (!parsed.args) {
              return {
                handled: true,
                feedback: 'Usage: /status open|in_progress|waiting|hold|resolved|closed',
              }
            }
            const result = await commsSetTicketStatus(ticketId, parsed.args)
            return { handled: true, feedback: `Ticket status set to ${result.status}.` }
          }

          case 'huddle':
            if (!options.huddleEnabled) {
              return {
                handled: true,
                feedback: '/huddle works in team and DM chats.',
              }
            }
            options.onStartHuddle()
            return { handled: true, feedback: 'Opening huddle…' }

          case 'remind': {
            const match = parsed.args.match(/^(\S+)\s+([\s\S]+)$/)
            if (!match) {
              return { handled: true, feedback: 'Usage: /remind 2h follow up with client' }
            }
            await commsCreateReminder({
              channelId: options.channelId,
              channelLabel: options.channelLabel,
              ticketId,
              remindIn: match[1],
              note: match[2],
            })
            return { handled: true, feedback: `Reminder saved for ${match[1]}.` }
          }

          default:
            return { handled: false }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Command failed'
        notifyError(message)
        return { handled: true, feedback: message }
      }
    },
    [options, ticketId]
  )

  const sendFeedback = useCallback(async (channel: Channel, feedback: string) => {
    await channel.sendMessage({
      text: feedback,
      type: 'system',
    })
  }, [])

  const handleSubmitMessage = useCallback(
    async ({
      message,
      sendOptions,
    }: {
      message: Message
      sendOptions: SendMessageOptions
    }) => {
      const text = message.text?.trim() ?? ''
      const hasGiphyAttachment = message.attachments?.some(
        attachment => attachment.type === 'giphy'
      )

      if (
        ('command' in message && message.command === 'giphy') ||
        hasGiphyAttachment
      ) {
        await channel.sendMessage(message, sendOptions)
        return
      }

      const slash = text ? await runSlashCommand(text) : null
      if (slash?.handled) {
        if (slash.feedback) await sendFeedback(channel, slash.feedback)
        return
      }

      const enriched = enrichCommsMentions(text, options.staff, {
        assigneeId: options.assigneeId,
        assigneeName: options.assigneeName,
        currentUserId: options.currentUserId,
      })

      const mentionedIds = [...enriched.mentionedUserIds]
      if (enriched.notifyAllOnline) {
        for (const memberId of options.onlineMemberIds) {
          if (memberId !== options.currentUserId) mentionedIds.push(memberId)
        }
      }

      const uniqueMentioned = [...new Set(mentionedIds)]

      const response = await channel.sendMessage(
        {
          ...message,
          text: enriched.text,
          ...(uniqueMentioned.length ? { mentioned_users: uniqueMentioned } : {}),
        },
        sendOptions
      )

      const messageId = response.message?.id
      if (messageId && mentionedIds.length > 0) {
        void commsNotifyMentions({
          mentionedUserIds: mentionedIds,
          channelId: options.channelId,
          channelLabel: options.channelLabel,
          ticketId,
          excerpt: enriched.text,
          messageId,
        })
      }
    },
    [channel, options, runSlashCommand, sendFeedback, ticketId]
  )

  return { handleSubmitMessage }
}

export async function copyCommsMessageToNote(ticketId: string, text: string) {
  try {
    await commsCopyMessageToInternalNote(ticketId, text)
    return true
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Could not copy to internal note')
    return false
  }
}
