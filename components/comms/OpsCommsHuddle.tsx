'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Headphones, Maximize2, Minimize2, X } from 'lucide-react'
import {
  CallControls,
  CallingState,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  StreamVideo,
  useCallStateHooks,
} from '@stream-io/video-react-sdk'
import type { Call } from '@stream-io/video-react-sdk'
import type { StreamVideoClient } from '@stream-io/video-react-sdk'
import type { Channel } from 'stream-chat'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { probeHuddleLiveCount, type HuddleContext } from '@/lib/comms/huddle'
import { ensureVideoConnected, formatHuddleError } from '@/lib/comms/ensure-video-connected'
import { useHuddleChatLog } from '@/lib/comms/use-huddle-chat-log'
import { cn } from '@/lib/utils'

type OpsCommsHuddleProps = {
  videoClient: StreamVideoClient
  credentials: StreamCommsCredentials
  context: HuddleContext
  channel: Channel
  channelId: string
  channelLabel: string
  ticketId?: string | null
  minimized?: boolean
  onMinimizedChange?: (minimized: boolean) => void
  autoMinimizeOnJoin?: boolean
  onLiveChange?: (live: boolean) => void
  onClose?: () => void
}

function participantLabel(name?: string, id?: string) {
  return name?.trim() || id || 'Teammate'
}

function HuddleModalFrame({
  context,
  mode,
  minimized = false,
  hasScreenShare = false,
  onMinimize,
  onRestore,
  onClose,
  children,
}: {
  context: HuddleContext
  mode: 'prejoin' | 'live'
  minimized?: boolean
  hasScreenShare?: boolean
  onMinimize?: () => void
  onRestore?: () => void
  onClose?: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'ops-comms-huddle-modal',
        mode === 'prejoin' && 'ops-comms-huddle-modal--prejoin',
        mode === 'live' && 'ops-comms-huddle-modal--live',
        mode === 'live' && minimized && 'ops-comms-huddle-modal--minimized',
        mode === 'live' && hasScreenShare && 'ops-comms-huddle-modal--screenshare'
      )}
      role="dialog"
      aria-modal={!minimized}
      aria-label={context.title}
    >
      <div className="ops-comms-huddle-shell ops-comms-huddle-shell--modal">
        <div className="ops-comms-huddle-shell-head">
          <span className="ops-comms-huddle-shell-title">
            <Headphones aria-hidden />
            {context.title}
          </span>
          <div className="ops-comms-huddle-shell-actions">
            {mode === 'live' ? (
              minimized ? (
                <button
                  type="button"
                  className="ops-comms-huddle-shell-icon-btn"
                  aria-label="Restore huddle"
                  onClick={onRestore}
                >
                  <Maximize2 aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  className="ops-comms-huddle-shell-icon-btn ops-comms-huddle-shell-icon-btn--chat"
                  aria-label="Minimize and keep chatting"
                  title="Keep chatting"
                  onClick={onMinimize}
                >
                  <Minimize2 aria-hidden />
                  <span className="ops-comms-huddle-shell-icon-btn-label">Chat</span>
                </button>
              )
            ) : null}
            {onClose ? (
              <button
                type="button"
                className="ops-comms-huddle-shell-icon-btn ops-comms-huddle-shell-icon-btn--close"
                aria-label="Leave huddle"
                onClick={onClose}
              >
                <X aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        <div className="ops-comms-huddle-theme">{children}</div>
      </div>
    </div>
  )
}

function HuddleLiveBody({
  minimized = false,
  onLeave,
  onTrackParticipantCount,
}: {
  minimized?: boolean
  onLeave: () => void
  onTrackParticipantCount?: (count: number) => void
}) {
  const { useCallCallingState, useParticipantCount, useParticipants } = useCallStateHooks()
  const callingState = useCallCallingState()
  const participantCount = useParticipantCount()
  const participants = useParticipants()

  useEffect(() => {
    if (callingState !== CallingState.JOINED) return
    onTrackParticipantCount?.(participantCount)
  }, [callingState, onTrackParticipantCount, participantCount])

  if (callingState === CallingState.LEFT) {
    return (
      <div className="ops-comms-huddle-idle ops-comms-huddle-idle--compact">
        <p className="ops-comms-huddle-copy">You left the huddle.</p>
        <button type="button" className="ops-comms-huddle-dismiss" onClick={onLeave}>
          Close
        </button>
      </div>
    )
  }

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="ops-comms-huddle-idle ops-comms-huddle-idle--compact">
        <p className="ops-comms-huddle-copy">Joining huddle…</p>
      </div>
    )
  }

  const names = participants
    .map(participant => participantLabel(participant.name, participant.userId))
    .filter((name, index, list) => list.indexOf(name) === index)

  return (
    <div
      className={cn('ops-comms-huddle-live', minimized && 'ops-comms-huddle-live--minimized')}
    >
      <div className="ops-comms-huddle-meta">
        <span>
          {participantCount} in huddle
          {names.length > 0 ? ` · ${names.join(', ')}` : ''}
        </span>
      </div>
      <div className="ops-comms-huddle-stage" aria-hidden={minimized}>
        <SpeakerLayout participantsBarPosition="bottom" />
      </div>
      <div className="ops-comms-huddle-controls">
        <CallControls onLeave={onLeave} />
      </div>
    </div>
  )
}

function HuddleLiveSession({
  call,
  context,
  minimized,
  onMinimize,
  onRestore,
  onLeave,
  onTrackParticipantCount,
}: {
  call: Call
  context: HuddleContext
  minimized: boolean
  onMinimize: () => void
  onRestore: () => void
  onLeave: () => void
  onTrackParticipantCount: (count: number) => void
}) {
  return (
    <StreamCall call={call}>
      <HuddleLiveSessionBody
        context={context}
        minimized={minimized}
        onMinimize={onMinimize}
        onRestore={onRestore}
        onLeave={onLeave}
        onTrackParticipantCount={onTrackParticipantCount}
      />
    </StreamCall>
  )
}

function HuddleLiveSessionBody({
  context,
  minimized,
  onMinimize,
  onRestore,
  onLeave,
  onTrackParticipantCount,
}: {
  context: HuddleContext
  minimized: boolean
  onMinimize: () => void
  onRestore: () => void
  onLeave: () => void
  onTrackParticipantCount: (count: number) => void
}) {
  const { useHasOngoingScreenShare } = useCallStateHooks()
  const hasScreenShare = useHasOngoingScreenShare()

  useEffect(() => {
    if (hasScreenShare && minimized) onRestore()
  }, [hasScreenShare, minimized, onRestore])

  return (
    <HuddleModalFrame
      context={context}
      mode="live"
      minimized={minimized}
      hasScreenShare={hasScreenShare}
      onMinimize={onMinimize}
      onRestore={onRestore}
      onClose={onLeave}
    >
      <StreamTheme className="ops-comms-huddle-theme">
        <HuddleLiveBody
          minimized={minimized}
          onLeave={onLeave}
          onTrackParticipantCount={onTrackParticipantCount}
        />
      </StreamTheme>
    </HuddleModalFrame>
  )
}

function HuddlePrejoin({
  context,
  liveCount,
  joining,
  preparing,
  error,
  onStart,
  onClose,
}: {
  context: HuddleContext
  liveCount: number | null
  joining: boolean
  preparing: boolean
  error: string | null
  onStart: () => void
  onClose?: () => void
}) {
  return (
    <HuddleModalFrame context={context} mode="prejoin" onClose={onClose}>
      <div className="ops-comms-huddle-idle ops-comms-huddle-idle--compact">
        <p className="ops-comms-huddle-copy">
          {preparing
            ? 'Preparing huddle…'
            : joining
              ? 'Connecting to huddle…'
              : liveCount
                ? context.prejoinLive(liveCount)
                : context.prejoinIdle}
        </p>
        {error ? <p className="ops-comms-huddle-error">{error}</p> : null}
        <button
          type="button"
          className="ops-comms-huddle-start"
          onClick={onStart}
          disabled={joining || preparing}
        >
          {joining ? 'Joining…' : liveCount ? 'Join huddle' : 'Start huddle'}
        </button>
      </div>
    </HuddleModalFrame>
  )
}

export function OpsCommsHuddle({
  videoClient,
  credentials,
  context,
  channel,
  channelId,
  channelLabel,
  ticketId,
  minimized: minimizedProp = false,
  onMinimizedChange,
  autoMinimizeOnJoin = false,
  onLiveChange,
  onClose,
}: OpsCommsHuddleProps) {
  const call = useMemo(
    () => videoClient.call(context.callType, context.callId),
    [videoClient, context.callType, context.callId]
  )
  const huddleLog = useHuddleChatLog({
    channel,
    channelId,
    channelLabel,
    ticketId,
    call,
    callId: context.callId,
    currentUserId: credentials.userId,
    currentUserName: credentials.userName,
  })
  const [phase, setPhase] = useState<'prejoin' | 'live'>('prejoin')
  const minimized = minimizedProp

  const setMinimized = useCallback(
    (value: boolean | ((current: boolean) => boolean)) => {
      const next = typeof value === 'function' ? value(minimized) : value
      onMinimizedChange?.(next)
    },
    [minimized, onMinimizedChange]
  )
  const [joining, setJoining] = useState(false)
  const [preparing, setPreparing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveCount, setLiveCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        await ensureVideoConnected(videoClient, credentials)
        if (cancelled) return

        const count = await probeHuddleLiveCount(videoClient, credentials, call)
        if (!cancelled) setLiveCount(count)
      } catch (err) {
        if (!cancelled) setError(formatHuddleError(err))
      } finally {
        if (!cancelled) setPreparing(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [call, credentials, videoClient])

  useEffect(() => {
    if (phase !== 'prejoin' || preparing) return

    const interval = window.setInterval(() => {
      void probeHuddleLiveCount(videoClient, credentials, call).then(count => {
        setLiveCount(count)
      })
    }, 12_000)

    return () => {
      window.clearInterval(interval)
    }
  }, [call, credentials, phase, preparing, videoClient])

  useEffect(() => {
    const previous = document.body.style.overflow
    const lockScroll = phase === 'prejoin' || (phase === 'live' && !minimized)
    document.body.style.overflow = lockScroll ? 'hidden' : previous

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (phase === 'live') {
        setMinimized(current => !current)
        return
      }
      onClose?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [minimized, onClose, phase])

  useEffect(() => {
    onLiveChange?.(phase === 'live')
  }, [onLiveChange, phase])

  useEffect(() => {
    return () => {
      void huddleLog.leaveWithLog()
      onLiveChange?.(false)
    }
  }, [huddleLog.leaveWithLog, onLiveChange])

  const leaveHuddle = useCallback(() => {
    void huddleLog.leaveWithLog().finally(() => {
      onLiveChange?.(false)
      onClose?.()
    })
  }, [huddleLog.leaveWithLog, onClose, onLiveChange])

  const startHuddle = useCallback(() => {
    setJoining(true)
    setError(null)
    const wasEmpty = !liveCount

    void (async () => {
      try {
        await ensureVideoConnected(videoClient, credentials)
        await call.join({ create: true })
        await call.camera.disable().catch(() => {})
        await huddleLog.logJoin(wasEmpty)
        setLiveCount(null)
        setMinimized(autoMinimizeOnJoin)
        setPhase('live')
      } catch (err) {
        setError(formatHuddleError(err))
      } finally {
        setJoining(false)
      }
    })()
  }, [autoMinimizeOnJoin, call, credentials, huddleLog, liveCount, setMinimized, videoClient])

  const handleBackdropClick = useCallback(() => {
    if (phase === 'live') {
      setMinimized(true)
      return
    }
    onClose?.()
  }, [onClose, phase])

  if (typeof document === 'undefined') return null

  const showBackdrop = phase === 'prejoin' || (phase === 'live' && !minimized)

  return createPortal(
    <div data-theme="dashboard">
      <div
        className={cn(
          'ops-comms-huddle-modal-portal',
          minimized && phase === 'live' && 'ops-comms-huddle-modal-portal--minimized'
        )}
      >
        {showBackdrop ? (
          <button
            type="button"
            className="ops-comms-huddle-modal-backdrop"
            aria-label={phase === 'live' ? 'Minimize huddle' : 'Close huddle'}
            onClick={handleBackdropClick}
          />
        ) : null}
        <div className="ops-comms-huddle-modal-layer">
          <StreamVideo client={videoClient}>
            {phase === 'live' ? (
              <HuddleLiveSession
                call={call}
                context={context}
                minimized={minimized}
                onMinimize={() => setMinimized(true)}
                onRestore={() => setMinimized(false)}
                onLeave={leaveHuddle}
                onTrackParticipantCount={huddleLog.trackParticipantCount}
              />
            ) : (
              <HuddlePrejoin
                context={context}
                liveCount={liveCount}
                joining={joining}
                preparing={preparing}
                error={error}
                onStart={startHuddle}
                onClose={onClose}
              />
            )}
          </StreamVideo>
        </div>
      </div>
    </div>,
    document.body
  )
}
