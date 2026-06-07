import type { Channel } from 'stream-chat'

export type ChannelMemberPresence = {
  id: string
  name: string
  online: boolean
}

export type ChannelWatcherPresence = {
  id: string
  name: string
}

export type ChannelPresenceSnapshot = {
  members: ChannelMemberPresence[]
  watching: ChannelWatcherPresence[]
  onlineCount: number
  watchingLabel: string | null
  metaTitle: string
}

export function staffNameMap(staff: { id: string; name: string }[]) {
  return new Map(staff.map(member => [member.id, member.name]))
}

export function readChannelPresence(
  channel: Channel,
  names: Map<string, string>,
  currentUserId: string
): ChannelPresenceSnapshot {
  const members = Object.values(channel.state?.members ?? {})
    .map(member => {
      const id = member.user_id ?? member.user?.id ?? ''
      if (!id) return null
      return {
        id,
        name: member.user?.name?.trim() || names.get(id) || 'Team member',
        online: Boolean(member.user?.online),
      }
    })
    .filter((member): member is ChannelMemberPresence => member !== null)
    .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name))

  const watching = Object.values(channel.state?.watchers ?? {})
    .map(watcher => {
      const id = watcher.id ?? ''
      if (!id) return null
      return {
        id,
        name: watcher.name?.trim() || names.get(id) || 'Team member',
      }
    })
    .filter((watcher): watcher is ChannelWatcherPresence => watcher !== null)

  const onlineCount = members.filter(member => member.online).length
  const watchingOthers = watching.filter(watcher => watcher.id !== currentUserId)
  const watchingLabel =
    watchingOthers.length > 0 ? watchingOthers.map(watcher => watcher.name).join(', ') : null

  const accessList = members.map(member => `${member.name}${member.online ? ' (online)' : ''}`)
  const viewingList =
    watching.length > 0
      ? watching.map(watcher => watcher.name).join(', ')
      : 'No one is viewing this channel right now'

  return {
    members,
    watching,
    onlineCount,
    watchingLabel,
    metaTitle: `Can access: ${accessList.join(', ')}\nViewing now: ${viewingList}`,
  }
}
