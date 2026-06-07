import { StreamClient } from '@stream-io/node-sdk'
import { StreamChat } from 'stream-chat'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { dmChannelId, ticketChannelId } from '@/lib/comms/stream-channels'
import {
  getStreamApiKey,
  getStreamApiSecret,
  isStreamConfigured,
  STREAM_HUDDLE_CALL_ID,
  STREAM_HUDDLE_CALL_TYPE,
  STREAM_TEAM_CHANNEL_ID,
} from '@/lib/comms/stream-config'
import { formatTicketId } from '@/lib/tickets/display'

type Db = SupabaseClient<Database>

export type StreamStaffMember = {
  id: string
  name: string
}

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
  staff: StreamStaffMember[]
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

async function ensureMessagingChannel(
  chatServer: StreamChat,
  channelId: string,
  members: string[],
  createdById: string,
  data?: Record<string, unknown>
) {
  const channel = chatServer.channel('messaging', channelId, {
    members,
    created_by_id: createdById,
    ...data,
  })

  try {
    await channel.create()
  } catch (createError) {
    try {
      await channel.query({ state: false })
      const existingMemberIds = Object.keys(channel.state?.members ?? {})
      const missingMembers = members.filter(memberId => !existingMemberIds.includes(memberId))
      if (missingMembers.length > 0) {
        await channel.addMembers(missingMembers)
      }
    } catch {
      const message =
        createError instanceof Error ? createError.message : 'Could not create comms channel'
      throw new Error(message)
    }
  }

  return channel
}

async function ensureTeamChannel(
  chatServer: StreamChat,
  staffIds: string[],
  createdById: string
) {
  return ensureMessagingChannel(chatServer, STREAM_TEAM_CHANNEL_ID, staffIds, createdById, {
    name: 'Team',
    channel_kind: 'team',
  })
}

export async function ensureTicketChannel(
  supabase: Db,
  user: User,
  ticketId: string
): Promise<string> {
  if (!isStreamConfigured()) {
    throw new Error('Stream is not configured')
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('id, title, client_id')
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    throw new Error('Ticket not found')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', ticket.client_id)
    .maybeSingle()

  const staff = await listStaffUsers(supabase)
  const staffIds = staff.map(member => member.id)
  const clientName = client?.name?.trim() || 'Client'
  const channelId = ticketChannelId(ticketId)
  const chatServer = getChatServer()

  await ensureMessagingChannel(chatServer, channelId, staffIds, user.id, {
    name: `${formatTicketId(ticketId)} · ${ticket.title}`,
    channel_kind: 'ticket',
    ticket_id: ticketId,
    ticket_title: ticket.title,
    client_name: clientName,
  })

  return channelId
}

export async function deleteTicketChannel(
  supabase: Db,
  ticketId: string
): Promise<string> {
  if (!isStreamConfigured()) {
    throw new Error('Stream is not configured')
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('id')
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    throw new Error('Ticket not found')
  }

  const channelId = ticketChannelId(ticketId)
  const chatServer = getChatServer()
  const channel = chatServer.channel('messaging', channelId)
  await channel.delete()

  return channelId
}

export async function ensureDmChannel(
  supabase: Db,
  user: User,
  otherUserId: string
): Promise<string> {
  if (!isStreamConfigured()) {
    throw new Error('Stream is not configured')
  }

  if (user.id === otherUserId) {
    throw new Error('Cannot message yourself')
  }

  const staff = await listStaffUsers(supabase)
  const other = staff.find(member => member.id === otherUserId)
  if (!other) {
    throw new Error('Staff member not found')
  }

  const channelId = dmChannelId(user.id, otherUserId)
  const chatServer = getChatServer()

  const { data: selfProfile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  await chatServer.upsertUsers([
    {
      id: user.id,
      name: selfProfile?.full_name?.trim() || user.email || 'Team member',
    },
    {
      id: otherUserId,
      name: other.full_name?.trim() || 'Team member',
    },
  ])

  await ensureMessagingChannel(chatServer, channelId, [user.id, otherUserId], user.id, {
    name: other.full_name?.trim() || 'Team member',
    channel_kind: 'dm',
    dm_with: otherUserId,
  })

  return channelId
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
    staff: staff.map(member => ({
      id: member.id,
      name: member.full_name?.trim() || 'Team member',
    })),
  }
}
