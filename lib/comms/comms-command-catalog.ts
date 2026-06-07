export type CommsCommandDefinition = {
  name: string
  aliases?: string[]
  description: string
  args: string
  ticketOnly?: boolean
  huddleOnly?: boolean
}

export const COMMS_COMMAND_CATALOG: CommsCommandDefinition[] = [
  {
    name: 'help',
    aliases: ['?', 'commands'],
    description: 'Show all commands',
    args: '',
  },
  {
    name: 'ticket',
    aliases: ['t'],
    description: 'Open a ticket chat',
    args: 'TKT-1234',
  },
  {
    name: 'assign',
    aliases: ['a'],
    description: 'Assign this ticket (use me for yourself)',
    args: 'me',
    ticketOnly: true,
  },
  {
    name: 'status',
    aliases: ['s'],
    description: 'Update ticket status',
    args: 'waiting',
    ticketOnly: true,
  },
  {
    name: 'huddle',
    aliases: ['h'],
    description: 'Start huddle in this chat',
    args: '',
    huddleOnly: true,
  },
  {
    name: 'remind',
    aliases: ['r'],
    description: 'Save reminder to ops bell',
    args: '2h follow up',
  },
]

export function filterCommsCommands(
  query: string,
  options: { ticketChannel: boolean; huddleChannel: boolean }
) {
  const normalized = query.trim().toLowerCase()

  return COMMS_COMMAND_CATALOG.filter(command => {
    if (command.ticketOnly && !options.ticketChannel) return false
    if (command.huddleOnly && !options.huddleChannel) return false
    if (!normalized) return true

    const names = [command.name, ...(command.aliases ?? [])]
    return names.some(name => name.startsWith(normalized) || name.includes(normalized))
  })
}

export function formatCommsCommand(command: CommsCommandDefinition) {
  return command.args ? `/${command.name} ${command.args}` : `/${command.name}`
}
