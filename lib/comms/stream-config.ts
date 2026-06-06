export const STREAM_TEAM_CHANNEL_ID = 'btf-team'
export const STREAM_HUDDLE_CALL_TYPE = 'default'
export const STREAM_HUDDLE_CALL_ID = 'btf-team-huddle'

export function isStreamConfigured() {
  return Boolean(
    process.env.STREAM_API_KEY?.trim() && process.env.STREAM_API_SECRET?.trim()
  )
}

export function getStreamApiKey() {
  const apiKey = process.env.STREAM_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('STREAM_API_KEY is not configured')
  }
  return apiKey
}

export function getStreamApiSecret() {
  const apiSecret = process.env.STREAM_API_SECRET?.trim()
  if (!apiSecret) {
    throw new Error('STREAM_API_SECRET is not configured')
  }
  return apiSecret
}
