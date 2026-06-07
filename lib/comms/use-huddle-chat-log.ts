'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Call } from '@stream-io/video-react-sdk'
import type { Channel } from 'stream-chat'
import { commsNotifyHuddleStarted } from '@/app/actions/comms'
import {
  formatHuddleDuration,
  huddleChannelMemberIds,
  HUDDLE_MIN_ALONE_LOG_MS,
  HUDDLE_UNANSWERED_MS,
  sendHuddleChatLog,
} from '@/lib/comms/huddle-chat-log'

type UseHuddleChatLogOptions = {
  channel: Channel
  channelId: string
  channelLabel: string
  ticketId?: string | null
  call: Call
  callId: string
  currentUserId: string
  currentUserName: string
}

export function useHuddleChatLog({
  channel,
  channelId,
  channelLabel,
  ticketId,
  call,
  callId,
  currentUserId,
  currentUserName,
}: UseHuddleChatLogOptions) {
  const joinedAtRef = useRef<number | null>(null)
  const wasStarterRef = useRef(false)
  const maxParticipantsRef = useRef(1)
  const unansweredLoggedRef = useRef(false)
  const hasLoggedJoinRef = useRef(false)
  const hasLoggedLeaveRef = useRef(false)
  const unansweredTimerRef = useRef<number | null>(null)

  const clearUnansweredTimer = useCallback(() => {
    if (!unansweredTimerRef.current) return
    window.clearTimeout(unansweredTimerRef.current)
    unansweredTimerRef.current = null
  }, [])

  const trackParticipantCount = useCallback((count: number) => {
    maxParticipantsRef.current = Math.max(maxParticipantsRef.current, count)
    if (count > 1) clearUnansweredTimer()
  }, [clearUnansweredTimer])

  const logJoin = useCallback(
    async (wasEmpty: boolean) => {
      if (hasLoggedJoinRef.current) return
      hasLoggedJoinRef.current = true
      hasLoggedLeaveRef.current = false

      const joinedAt = Date.now()
      joinedAtRef.current = joinedAt
      wasStarterRef.current = wasEmpty
      maxParticipantsRef.current = 1
      unansweredLoggedRef.current = false

      const name = currentUserName.trim() || 'Teammate'

      if (wasEmpty) {
        await sendHuddleChatLog(channel, `Huddle started · ${name}`, 'started')

        const recipients = huddleChannelMemberIds(channel, currentUserId)
        if (recipients.length > 0) {
          void commsNotifyHuddleStarted({
            recipientUserIds: recipients,
            channelId,
            channelLabel,
            ticketId,
            starterName: name,
            callId,
            sessionStartedAt: joinedAt,
          })
        }

        unansweredTimerRef.current = window.setTimeout(() => {
          if (maxParticipantsRef.current > 1 || unansweredLoggedRef.current) return
          unansweredLoggedRef.current = true
          void sendHuddleChatLog(
            channel,
            `Unanswered huddle · ${formatHuddleDuration(HUDDLE_UNANSWERED_MS)}`,
            'unanswered'
          )
        }, HUDDLE_UNANSWERED_MS)
        return
      }

      await sendHuddleChatLog(channel, `${name} joined the huddle`, 'joined')
    },
    [
      callId,
      channel,
      channelId,
      channelLabel,
      currentUserId,
      currentUserName,
      ticketId,
    ]
  )

  const logLeave = useCallback(
    async (participantCountBeforeLeave: number) => {
      if (hasLoggedLeaveRef.current || !hasLoggedJoinRef.current) return
      hasLoggedLeaveRef.current = true
      clearUnansweredTimer()

      const joinedAt = joinedAtRef.current
      const durationMs = joinedAt ? Date.now() - joinedAt : 0
      const durationLabel = formatHuddleDuration(durationMs)
      const name = currentUserName.trim() || 'Teammate'

      if (maxParticipantsRef.current <= 1) {
        if (!unansweredLoggedRef.current && durationMs >= HUDDLE_MIN_ALONE_LOG_MS) {
          unansweredLoggedRef.current = true
          await sendHuddleChatLog(
            channel,
            `Unanswered huddle · ${durationLabel}`,
            'unanswered'
          )
          return
        }

        if (!unansweredLoggedRef.current) return
        await sendHuddleChatLog(channel, `${name} ended huddle · ${durationLabel}`, 'ended')
        return
      }

      if (participantCountBeforeLeave <= 1) {
        await sendHuddleChatLog(channel, `Huddle ended · ${durationLabel}`, 'ended')
        return
      }

      await sendHuddleChatLog(channel, `${name} left the huddle · ${durationLabel}`, 'left')
    },
    [channel, clearUnansweredTimer, currentUserName]
  )

  const leaveWithLog = useCallback(async () => {
    const participantCount = call.state.session?.participants?.length ?? 1

    await logLeave(participantCount)
    await call.leave()
  }, [call, logLeave])

  useEffect(() => {
    return () => {
      clearUnansweredTimer()
    }
  }, [clearUnansweredTimer])

  return {
    logJoin,
    logLeave,
    leaveWithLog,
    trackParticipantCount,
  }
}
