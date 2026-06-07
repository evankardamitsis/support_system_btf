'use client'

import { useEffect } from 'react'
import { MessageComposer } from 'stream-chat-react'
import type { Message, SendMessageOptions } from 'stream-chat'
import { ensureEmojiMart, SearchIndex } from '@/lib/comms/emoji-setup'

type OpsCommsComposerShellProps = {
  onSubmit: (payload: { message: Message; sendOptions: SendMessageOptions }) => Promise<void>
}

export function OpsCommsComposerShell({ onSubmit }: OpsCommsComposerShellProps) {
  useEffect(() => {
    ensureEmojiMart()
  }, [])

  return (
    <MessageComposer
      emojiSearchIndex={SearchIndex}
      overrideSubmitHandler={async ({ message, sendOptions }) => {
        await onSubmit({ message, sendOptions })
      }}
    />
  )
}
