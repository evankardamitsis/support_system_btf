import { StreamClient } from '@stream-io/node-sdk'
import { StreamChat } from 'stream-chat'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  getStreamApiKey,
  getStreamApiSecret,
  isStreamConfigured,
  STREAM_HUDDLE_CALL_ID,
  STREAM_HUDDLE_CALL_TYPE,
  STREAM_TEAM_CHANNEL_ID,
} from '@/lib/comms/stream-config'

type Db = SupabaseClient<Database>

export type StreamCommsCredentials = {
  apiKey: string
  userId: string
  userName: string
  userImage?: string
  chatToken: string
  videoToken: string
  teamChannelId: string
  huddleCallType: string
  huddleCallId: string
}

function getChatServer() {
  return StreamChat.getInstance(getStreamApiKey(), getStreamApiSecret())
}

function getVideoServer() {
  return new StreamClient(getStreamApiKey(), getStreamApiSecret())
}

async function listStaffUsers(supabase: Db) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role')
    .in('role', ['admin', 'agent'])

  if (error) throw new Error(error.message)
  return data ?? []
}

async function ensureTeamChannel(
  chatServer: StreamChat,
  staffIds: string[],
  createdById: string
) {
  const channel = chatServer.channel('messaging', STREAM_TEAM_CHANNEL_ID, {
    members: staffIds,
    created_by_id: createdById,
  })

  try {
    await channel.create()
  } catch {
    if (staffIds.length > 0) {
      await channel.addMembers(staffIds)
    }
  }

  return channel
}

export async function getStreamCommsCredentials(
  supabase: Db,
  user: User,
  profile: { full_name: string | null; role: string } | null
): Promise<StreamCommsCredentials> {
  if (!isStreamConfigured()) {
    throw new Error('Stream is not configured')
  }

  const staff = await listStaffUsers(supabase)
  const staffIds = staff.map(member => member.id)
  const displayName = profile?.full_name?.trim() || user.email || 'Team member'

  const chatServer = getChatServer()
  await chatServer.upsertUsers(
    staff.map(member => ({
      id: member.id,
      name: member.full_name?.trim() || 'Team member',
      role: member.role,
    }))
  )

  await ensureTeamChannel(chatServer, staffIds, user.id)

  const chatToken = chatServer.createToken(user.id)
  const videoServer = getVideoServer()
  const videoToken = videoServer.generateUserToken({
    user_id: user.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
  })

  return {
    apiKey: getStreamApiKey(),
    userId: user.id,
    userName: displayName,
    chatToken,
    videoToken,
    teamChannelId: STREAM_TEAM_CHANNEL_ID,
    huddleCallType: STREAM_HUDDLE_CALL_TYPE,
    huddleCallId: STREAM_HUDDLE_CALL_ID,
  }
}
