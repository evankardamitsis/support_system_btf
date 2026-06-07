import type { CommsCommandDefinition } from '@/lib/comms/comms-command-catalog'
import type { CommsMentionSuggestion } from '@/lib/comms/comms-mention-catalog'

export type CommsInstantSuggestion =
  | {
      kind: 'command'
      id: string
      primary: string
      description: string
      meta?: string
      command: CommsCommandDefinition
    }
  | {
      kind: 'mention'
      id: string
      primary: string
      description: string
      mention: CommsMentionSuggestion
    }

export type CommsInstantTrigger = 'slash' | 'mention' | null

export function buildInstantSuggestions(
  trigger: CommsInstantTrigger,
  commands: CommsCommandDefinition[],
  mentions: CommsMentionSuggestion[]
): CommsInstantSuggestion[] {
  if (trigger === 'slash') {
    return commands.map(command => ({
      kind: 'command' as const,
      id: command.name,
      primary: `/${command.name}`,
      description: command.description,
      meta: command.args || undefined,
      command,
    }))
  }

  if (trigger === 'mention') {
    return mentions.map(mention => ({
      kind: 'mention' as const,
      id: mention.id,
      primary: mention.label,
      description: mention.description,
      mention,
    }))
  }

  return []
}
