'use client'

import '@stream-io/video-react-sdk/dist/css/styles.css'

import { useEffect, useRef, useState } from 'react'
import { Headphones, X } from 'lucide-react'
import {
  CallControls,
  CallingState,
  ScreenShareButton,
  SpeakerLayout,
  StreamCall,
  StreamVideo,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk'
import type { Call } from '@stream-io/video-react-sdk'
import type { StreamVideoClient } from '@stream-io/video-react-sdk'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'

type OpsCommsHuddleProps = {
  videoClient: StreamVideoClient
  credentials: StreamCommsCredentials
  onClose?: () => void
  joinOnOpen?: boolean
}

function participantLabel(name?: string, id?: string) {
  return name?.trim() || id || 'Teammate'
}

function HuddleBody({ onLeave }: { onLeave: () => void }) {
  const call = useCall()
  const { useCallCallingState, useParticipantCount, useParticipants } = useCallStateHooks()
  const callingState = useCallCallingState()
  const participantCount = useParticipantCount()
  const participants = useParticipants()

  if (!call) return null

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
    .map(p => participantLabel(p.name, p.userId))
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
        <ToggleAudioPublishingButton />
        <ToggleVideoPublishingButton />
        <ScreenShareButton />
        <CallControls onLeave={onLeave} />
      </div>
    </div>
  )
}

export function OpsCommsHuddle({
  videoClient,
  credentials,
  onClose,
  joinOnOpen = false,
}: OpsCommsHuddleProps) {
  const [call, setCall] = useState<Call | null>(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveCount, setLiveCount] = useState<number | null>(null)
  const joinAttemptedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadLiveCount() {
      try {
        const probe = videoClient.call(
          credentials.huddleCallType,
          credentials.huddleCallId
        )
        const state = await probe.get()
        if (cancelled) return
        const count = state.call.session?.participants?.length ?? 0
        setLiveCount(count > 0 ? count : null)
      } catch {
        if (!cancelled) setLiveCount(null)
      }
    }

    if (!call) {
      void loadLiveCount()
    }

    return () => {
      cancelled = true
    }
  }, [videoClient, credentials.huddleCallType, credentials.huddleCallId, call])

  useEffect(() => {
    return () => {
      if (call) {
        void call.leave()
      }
    }
  }, [call])

  async function startHuddle() {
    setJoining(true)
    setError(null)

    try {
      const nextCall = videoClient.call(
        credentials.huddleCallType,
        credentials.huddleCallId
      )
      await nextCall.join({ create: true })
      setCall(nextCall)
      setLiveCount(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start huddle')
    } finally {
      setJoining(false)
    }
  }

  useEffect(() => {
    if (!joinOnOpen || call || joining || joinAttemptedRef.current) return
    joinAttemptedRef.current = true
    void startHuddle()
  }, [joinOnOpen, call, joining])

  async function leaveHuddle() {
    if (call) {
      await call.leave()
      setCall(null)
    }
    onClose?.()
  }

  if (!call) {
    return (
      <div className="ops-comms-huddle-shell">
        {onClose ? (
          <div className="ops-comms-huddle-shell-head">
            <span className="ops-comms-huddle-shell-title">
              <Headphones aria-hidden />
              Team huddle
            </span>
            <button
              type="button"
              className="ops-comms-huddle-shell-close"
              aria-label="Close huddle"
              onClick={onClose}
            >
              <X aria-hidden />
            </button>
          </div>
        ) : null}
        <div className="ops-comms-huddle-idle ops-comms-huddle-idle--compact">
          {joinOnOpen ? (
            <p className="ops-comms-huddle-copy">{joining ? 'Joining huddle…' : 'Connecting…'}</p>
          ) : (
            <>
              <p className="ops-comms-huddle-copy">
                {liveCount
                  ? `${liveCount} teammate${liveCount === 1 ? '' : 's'} in the huddle.`
                  : 'Start a voice huddle with the team.'}
              </p>
              {error ? <p className="ops-comms-huddle-error">{error}</p> : null}
              <button
                type="button"
                className="ops-comms-huddle-start"
                onClick={() => void startHuddle()}
                disabled={joining}
              >
                {joining ? 'Joining…' : liveCount ? 'Join' : 'Start huddle'}
              </button>
            </>
          )}
          {joinOnOpen && error ? <p className="ops-comms-huddle-error">{error}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="ops-comms-huddle-shell">
      {onClose ? (
        <div className="ops-comms-huddle-shell-head">
          <span className="ops-comms-huddle-shell-title">
            <Headphones aria-hidden />
            Team huddle
          </span>
          <button
            type="button"
            className="ops-comms-huddle-shell-close"
            aria-label="Close huddle"
            onClick={() => void leaveHuddle()}
          >
            <X aria-hidden />
          </button>
        </div>
      ) : null}
      <StreamVideo client={videoClient}>
        <StreamCall call={call}>
          <HuddleBody onLeave={() => void leaveHuddle()} />
        </StreamCall>
      </StreamVideo>
    </div>
  )
}
