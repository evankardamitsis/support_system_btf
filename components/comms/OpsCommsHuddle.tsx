'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Headphones, X } from 'lucide-react'
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
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { probeHuddleLiveCount, type HuddleContext } from '@/lib/comms/huddle'
import { ensureVideoConnected, formatHuddleError } from '@/lib/comms/ensure-video-connected'
import { cn } from '@/lib/utils'

type OpsCommsHuddleProps = {
  videoClient: StreamVideoClient
  credentials: StreamCommsCredentials
  context: HuddleContext
  onClose?: () => void
}

function participantLabel(name?: string, id?: string) {
  return name?.trim() || id || 'Teammate'
}

function HuddleModalFrame({
  context,
  mode,
  onClose,
  children,
}: {
  context: HuddleContext
  mode: 'prejoin' | 'live'
  onClose?: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'ops-comms-huddle-modal',
        mode === 'prejoin' && 'ops-comms-huddle-modal--prejoin',
        mode === 'live' && 'ops-comms-huddle-modal--live'
      )}
      role="dialog"
      aria-modal="true"
      aria-label={context.title}
    >
      <div className="ops-comms-huddle-shell ops-comms-huddle-shell--modal">
        <div className="ops-comms-huddle-shell-head">
          <span className="ops-comms-huddle-shell-title">
            <Headphones aria-hidden />
            {context.title}
          </span>
          {onClose ? (
            <button
              type="button"
              className="ops-comms-huddle-shell-close"
              aria-label="Close huddle"
              onClick={onClose}
            >
              <X aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="ops-comms-huddle-theme">{children}</div>
      </div>
    </div>
  )
}

function HuddleLiveBody({ onLeave }: { onLeave: () => void }) {
  const { useCallCallingState, useParticipantCount, useParticipants } = useCallStateHooks()
  const callingState = useCallCallingState()
  const participantCount = useParticipantCount()
  const participants = useParticipants()

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
    <div className="ops-comms-huddle-live">
      <div className="ops-comms-huddle-meta">
        <span>
          {participantCount} in huddle
          {names.length > 0 ? ` · ${names.join(', ')}` : ''}
        </span>
      </div>
      <div className="ops-comms-huddle-stage">
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
  onClose,
}: {
  call: Call
  context: HuddleContext
  onClose?: () => void
}) {
  const leaveHuddle = useCallback(() => {
    void call.leave().finally(() => {
      onClose?.()
    })
  }, [call, onClose])

  return (
    <StreamCall call={call}>
      <HuddleModalFrame context={context} mode="live" onClose={leaveHuddle}>
        <StreamTheme className="ops-comms-huddle-theme">
          <HuddleLiveBody onLeave={leaveHuddle} />
        </StreamTheme>
      </HuddleModalFrame>
    </StreamCall>
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

export function OpsCommsHuddle({ videoClient, credentials, context, onClose }: OpsCommsHuddleProps) {
  const call = useMemo(
    () => videoClient.call(context.callType, context.callId),
    [videoClient, context.callType, context.callId]
  )
  const [phase, setPhase] = useState<'prejoin' | 'live'>('prejoin')
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
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    return () => {
      void call.leave()
    }
  }, [call])

  const startHuddle = useCallback(() => {
    setJoining(true)
    setError(null)

    void (async () => {
      try {
        await ensureVideoConnected(videoClient, credentials)
        await call.join({ create: true })
        await call.camera.disable().catch(() => {})
        setLiveCount(null)
        setPhase('live')
      } catch (err) {
        setError(formatHuddleError(err))
      } finally {
        setJoining(false)
      }
    })()
  }, [call, credentials, videoClient])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div data-theme="dashboard">
      <div className="ops-comms-huddle-modal-portal">
        <button
          type="button"
          className="ops-comms-huddle-modal-backdrop"
          aria-label="Close huddle"
          onClick={onClose}
        />
        <div className="ops-comms-huddle-modal-layer">
          <StreamVideo client={videoClient}>
            {phase === 'live' ? (
              <HuddleLiveSession call={call} context={context} onClose={onClose} />
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
