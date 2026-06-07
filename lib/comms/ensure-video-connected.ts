import type { StreamVideoClient } from '@stream-io/video-react-sdk'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'

const CONNECT_POLL_MS = 50
const CONNECT_TIMEOUT_MS = 20_000

const connectTasks = new WeakMap<StreamVideoClient, Promise<void>>()

type StreamClientInternals = {
  userID?: string
  connectUserTask?: Promise<unknown>
}

type VideoClientInternals = StreamVideoClient & {
  streamClient?: StreamClientInternals
}

function sleep(ms: number) {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, ms)
  })
}

export function isVideoConnected(videoClient: StreamVideoClient, userId: string) {
  return videoClient.state.connectedUser?.id === userId
}

function getPendingVideoConnectTask(videoClient: StreamVideoClient, userId: string) {
  const streamClient = (videoClient as VideoClientInternals).streamClient
  if (streamClient?.userID === userId && streamClient.connectUserTask) {
    return streamClient.connectUserTask
  }
  return null
}

async function waitForVideoConnected(
  videoClient: StreamVideoClient,
  userId: string
) {
  if (isVideoConnected(videoClient, userId)) return

  const deadline = Date.now() + CONNECT_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (isVideoConnected(videoClient, userId)) return

    const pending = getPendingVideoConnectTask(videoClient, userId)
    if (pending) {
      await pending.catch(() => undefined)
      if (isVideoConnected(videoClient, userId)) return
    }

    await sleep(CONNECT_POLL_MS)
  }

  throw new Error('Video connection timed out. Close COMMS and try again.')
}

export async function ensureVideoConnected(
  videoClient: StreamVideoClient,
  credentials: Pick<StreamCommsCredentials, 'userId' | 'userName' | 'videoToken'>
) {
  if (isVideoConnected(videoClient, credentials.userId)) return

  const existing = connectTasks.get(videoClient)
  if (existing) {
    await existing
    return
  }

  const task = waitForVideoConnected(videoClient, credentials.userId)
    .then(() => undefined)
    .finally(() => {
      connectTasks.delete(videoClient)
    })

  connectTasks.set(videoClient, task)
  await task
}

export function formatHuddleError(error: unknown) {
  if (!(error instanceof Error)) return 'Could not start huddle'

  const message = error.message.trim()
  if (!message) return 'Could not start huddle'

  if (/permission|notallowed|denied/i.test(message)) {
    return 'Microphone access was blocked. Allow mic access in your browser, then try again.'
  }

  if (/token|unauthorized|forbidden/i.test(message)) {
    return 'Comms session expired. Close COMMS, reopen it, and try the huddle again.'
  }

  return message
}
