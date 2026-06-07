'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  MessageComposerUI as StreamMessageComposerUI,
  useMessageComposerContext,
  useMessageComposerController,
  useStateStore,
} from 'stream-chat-react'
import type { StreamStaffMember } from '@/lib/comms/stream-server'
import {
  filterCommsCommands,
  formatCommsCommand,
  type CommsCommandDefinition,
} from '@/lib/comms/comms-command-catalog'
import {
  filterCommsMentions,
  parseMentionHead,
  replaceMentionTail,
  type CommsMentionSuggestion,
} from '@/lib/comms/comms-mention-catalog'
import {
  buildInstantSuggestions,
  type CommsInstantSuggestion,
  type CommsInstantTrigger,
} from '@/lib/comms/comms-instant-suggestions'
import { cn } from '@/lib/utils'

export type CommsComposerConfig = {
  ticketChannel: boolean
  huddleChannel: boolean
  staff: StreamStaffMember[]
  assigneeName?: string | null
  currentUserId: string
}

function parseSlashHead(value: string) {
  if (!value.startsWith('/')) return null
  const head = value.split('\n')[0] ?? ''
  if (head.includes(' ')) return null
  return head.slice(1)
}

export function createOpsCommsMessageComposerUI(config: CommsComposerConfig) {
  return function OpsCommsMessageComposerUI() {
    const messageComposer = useMessageComposerController()
    const { textComposer } = messageComposer
    const { textareaRef } = useMessageComposerContext()

    const { text, command } = useStateStore(textComposer.state, state => ({
      text: state.text,
      command: state.command,
    }))

    const [slashQuery, setSlashQuery] = useState('')
    const [mentionQuery, setMentionQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const paletteListRef = useRef<HTMLUListElement>(null)

    const instantTrigger: CommsInstantTrigger = useMemo(() => {
      if (command) return null
      if (parseSlashHead(text) !== null) return 'slash'
      if (parseMentionHead(text) !== null) return 'mention'
      return null
    }, [command, text])

    const commands = useMemo(
      () =>
        filterCommsCommands(slashQuery, {
          ticketChannel: config.ticketChannel,
          huddleChannel: config.huddleChannel,
        }),
      [slashQuery, config.ticketChannel, config.huddleChannel]
    )

    const mentions = useMemo(
      () =>
        filterCommsMentions(mentionQuery, config.staff, {
          ticketChannel: config.ticketChannel,
          assigneeName: config.assigneeName,
          currentUserId: config.currentUserId,
        }),
      [mentionQuery, config.staff, config.ticketChannel, config.assigneeName, config.currentUserId]
    )

    const instantSuggestions = useMemo(
      () => buildInstantSuggestions(instantTrigger, commands, mentions),
      [instantTrigger, commands, mentions]
    )

    const syncPaletteFromText = useCallback((value: string) => {
      const slash = parseSlashHead(value)
      if (slash !== null) {
        setSlashQuery(slash)
        setMentionQuery('')
        setActiveIndex(0)
        return
      }

      const mention = parseMentionHead(value)
      if (mention !== null) {
        setMentionQuery(mention)
        setSlashQuery('')
        setActiveIndex(0)
        return
      }

      setSlashQuery('')
      setMentionQuery('')
      setActiveIndex(0)
    }, [])

    useEffect(() => {
      syncPaletteFromText(text)
    }, [text, syncPaletteFromText])

    useEffect(() => {
      textComposer.closeSuggestions()
    }, [text, textComposer])

    const applyText = useCallback(
      (next: string) => {
        textComposer.setText(next)
        textComposer.setSelection({ start: next.length, end: next.length })
      },
      [textComposer]
    )

    const applyCommand = useCallback(
      (commandDef: CommsCommandDefinition) => {
        applyText(`${formatCommsCommand(commandDef)} `)
      },
      [applyText]
    )

    const applyMention = useCallback(
      (mention: CommsMentionSuggestion) => {
        applyText(replaceMentionTail(textComposer.text, mention.insert))
      },
      [applyText, textComposer]
    )

    const applySuggestion = useCallback(
      (suggestion: CommsInstantSuggestion) => {
        if (suggestion.kind === 'command') {
          applyCommand(suggestion.command)
          return
        }
        applyMention(suggestion.mention)
      },
      [applyCommand, applyMention]
    )

    const applyActiveSuggestion = useCallback(() => {
      const selected = instantSuggestions[activeIndex] ?? instantSuggestions[0]
      if (selected) applySuggestion(selected)
    }, [activeIndex, applySuggestion, instantSuggestions])

    useEffect(() => {
      const list = paletteListRef.current
      if (!list) return
      const active = list.querySelector<HTMLElement>('[aria-selected="true"]')
      active?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex, instantSuggestions.length, instantTrigger])

    useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      function handleKeyDown(event: KeyboardEvent) {
        if (!instantTrigger || instantSuggestions.length === 0) return

        if (event.key === 'ArrowDown') {
          event.preventDefault()
          event.stopPropagation()
          setActiveIndex(current => (current + 1) % instantSuggestions.length)
          return
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault()
          event.stopPropagation()
          setActiveIndex(
            current => (current - 1 + instantSuggestions.length) % instantSuggestions.length
          )
          return
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          setSlashQuery('')
          setMentionQuery('')
          setActiveIndex(0)
          return
        }

        if (event.key === 'Tab') {
          event.preventDefault()
          event.stopPropagation()
          applyActiveSuggestion()
          return
        }

        if (event.key === 'Enter' && !event.shiftKey && instantTrigger === 'slash') {
          const exact = commands.find(
            commandDef =>
              commandDef.name === slashQuery ||
              commandDef.aliases?.some(alias => alias === slashQuery)
          )
          if (exact) return

          event.preventDefault()
          event.stopPropagation()
          applyActiveSuggestion()
          return
        }

        if (event.key === 'Enter' && !event.shiftKey && instantTrigger === 'mention') {
          event.preventDefault()
          event.stopPropagation()
          applyActiveSuggestion()
        }
      }

      textarea.addEventListener('keydown', handleKeyDown, { capture: true })
      return () => textarea.removeEventListener('keydown', handleKeyDown, { capture: true })
    }, [
      applyActiveSuggestion,
      commands,
      instantSuggestions.length,
      instantTrigger,
      slashQuery,
      textareaRef,
    ])

    return (
      <div className="ops-comms-composer-shell">
        {instantTrigger ? (
          <ComposerInstantPalette
            trigger={instantTrigger}
            ticketChannel={config.ticketChannel}
            listRef={paletteListRef}
            emptyLabel={
              instantTrigger === 'slash' ? 'No matching commands.' : 'No matching mentions.'
            }
            items={instantSuggestions.map((suggestion, index) => ({
              key: suggestion.id,
              active: index === activeIndex,
              primary: suggestion.primary,
              description: suggestion.description,
              meta: suggestion.kind === 'command' ? suggestion.meta : undefined,
              onHover: () => setActiveIndex(index),
              onSelect: () => applySuggestion(suggestion),
            }))}
          />
        ) : (
          <p className="ops-comms-composer-hint">
            Type <span>/</span> or <span>@</span> for instant commands · <span>/assign me</span>{' '}
            in ticket chats
          </p>
        )}
        <StreamMessageComposerUI />
      </div>
    )
  }
}

type PaletteItem = {
  key: string
  active: boolean
  primary: string
  description: string
  meta?: string
  onHover: () => void
  onSelect: () => void
}

function ComposerInstantPalette({
  trigger,
  ticketChannel,
  listRef,
  emptyLabel,
  items,
}: {
  trigger: Exclude<CommsInstantTrigger, null>
  ticketChannel: boolean
  listRef: RefObject<HTMLUListElement | null>
  emptyLabel: string
  items: PaletteItem[]
}) {
  const title = trigger === 'slash' ? 'Commands' : 'Mentions'

  return (
    <div
      className={cn(
        'ops-comms-slash-palette',
        trigger === 'slash' && ticketChannel && 'ops-comms-slash-palette--ticket'
      )}
      role="listbox"
      aria-label={`Instant commands · ${title}`}
    >
      <div className="ops-comms-slash-palette-head">
        Instant commands
        <span className="ops-comms-slash-palette-kind">{title}</span>
      </div>
      {items.length === 0 ? (
        <p className="ops-comms-slash-palette-empty">{emptyLabel}</p>
      ) : (
        <ul ref={listRef} className="ops-comms-slash-palette-list">
          {items.map(item => (
            <li key={item.key}>
              <button
                type="button"
                role="option"
                aria-selected={item.active}
                className={cn('ops-comms-slash-palette-item', item.active && 'is-active')}
                onMouseEnter={item.onHover}
                onMouseDown={event => event.preventDefault()}
                onClick={item.onSelect}
              >
                <span className="ops-comms-slash-palette-item-name">{item.primary}</span>
                <span className="ops-comms-slash-palette-item-desc">{item.description}</span>
                {item.meta ? (
                  <span className="ops-comms-slash-palette-item-args">{item.meta}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
