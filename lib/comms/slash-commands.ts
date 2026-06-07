import type { TicketStatus } from '@/lib/types'

export type SlashCommandName =
  | 'ticket'
  | 'assign'
  | 'status'
  | 'huddle'
  | 'remind'
  | 'help'

export type ParsedSlashCommand = {
  name: SlashCommandName
  args: string
}

const STATUS_ALIASES: Record<string, TicketStatus> = {
  open: 'open',
  opened: 'open',
  progress: 'in_progress',
  in_progress: 'in_progress',
  working: 'in_progress',
  waiting: 'waiting_on_client',
  waiting_on_client: 'waiting_on_client',
  client: 'waiting_on_client',
  hold: 'on_hold',
  on_hold: 'on_hold',
  blocked: 'on_hold',
  resolved: 'resolved',
  done: 'resolved',
  closed: 'closed',
  close: 'closed',
}

export function parseSlashCommand(text: string): ParsedSlashCommand | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/')) return null

  const body = trimmed.slice(1).trim()
  if (!body) return { name: 'help', args: '' }

  const spaceIndex = body.indexOf(' ')
  const command = (spaceIndex === -1 ? body : body.slice(0, spaceIndex)).toLowerCase()
  const args = spaceIndex === -1 ? '' : body.slice(spaceIndex + 1).trim()

  if (command === 'ticket' || command === 't') return { name: 'ticket', args }
  if (command === 'assign' || command === 'a') return { name: 'assign', args }
  if (command === 'status' || command === 's') return { name: 'status', args }
  if (command === 'huddle' || command === 'h') return { name: 'huddle', args }
  if (command === 'remind' || command === 'r') return { name: 'remind', args }
  if (command === 'help' || command === 'commands' || command === '?') return { name: 'help', args }

  return null
}

export function resolveStatusAlias(value: string): TicketStatus | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, '_')
  return STATUS_ALIASES[key] ?? null
}

export const COMMS_SLASH_HELP = [
  '/ticket TKT-1234 — open ticket chat',
  '/assign me — assign ticket to yourself (ticket chats)',
  '/assign @name — assign ticket to teammate',
  '/status waiting — update ticket status',
  '/huddle — start huddle (team or DM)',
  '/remind 2h follow up client — reminder in ops bell',
  '/help — show commands',
].join('\n')
