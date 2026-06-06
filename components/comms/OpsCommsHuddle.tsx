'use client'

import { useEffect, useState } from 'react'
import {
  CallControls,
  CallingState,
  ScreenShareButton,
  SpeakerLayout,
  StreamCall,
  StreamVideo,
  ToggleAudioPublishingButton,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk'
import type { Call } from '@stream-io/video-react-sdk'
import type { StreamVideoClient } from '@stream-io/video-react-sdk'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'
import { Button } from '@/components/ui/button'

type OpsCommsHuddleProps = {
  videoClient: StreamVideoClient
  credentials: StreamCommsCredentials
}

function HuddleBody({ onLeave }: { onLeave: () => void }) {
  const call = useCall()
  const { useCallCallingState, useParticipantCount } = useCallStateHooks()
  const callingState = useCallCallingState()
  const participantCount = useParticipantCount()

  if (!call) return null

  if (callingState === CallingState.LEFT) {
    return (
      <div className="ops-comms-huddle-idle">
        <p className="ops-comms-huddle-copy">You left the huddle.</p>
        <Button type="button" size="sm" onClick={onLeave}>
          Close
        </Button>
      </div>
    )
  }

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="ops-comms-huddle-idle">
        <p className="ops-comms-huddle-copy">Joining team huddle…</p>
      </div>
    )
  }

  return (
    <div className="ops-comms-huddle-live">
      <div className="ops-comms-huddle-meta">
        <span>{participantCount} in huddle</span>
        <span>Screen share and mute controls below</span>
      </div>
      <div className="ops-comms-huddle-stage">
        <SpeakerLayout participantsBarPosition="bottom" />
      </div>
      <div className="ops-comms-huddle-controls">
        <ToggleAudioPublishingButton />
        <ScreenShareButton />
        <CallControls onLeave={onLeave} />
      </div>
    </div>
  )
}

export function OpsCommsHuddle({ videoClient, credentials }: OpsCommsHuddleProps) {
  const [call, setCall] = useState<Call | null>(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start huddle')
    } finally {
      setJoining(false)
    }
  }

  async function leaveHuddle() {
    if (call) {
      await call.leave()
      setCall(null)
    }
  }

  if (!call) {
    return (
      <div className="ops-comms-huddle-idle">
        <div className="ops-comms-huddle-hero">
          <h4>Team huddle</h4>
          <p>
            Start a quick voice call with screen sharing for the whole team. Anyone
            on the dashboard can jump in.
          </p>
        </div>
        {error ? <p className="ops-comms-huddle-error">{error}</p> : null}
        <Button type="button" onClick={() => void startHuddle()} disabled={joining}>
          {joining ? 'Starting…' : 'Start huddle'}
        </Button>
      </div>
    )
  }

  return (
    <StreamVideo client={videoClient}>
      <StreamCall call={call}>
        <HuddleBody onLeave={() => void leaveHuddle()} />
      </StreamCall>
    </StreamVideo>
  )
}
