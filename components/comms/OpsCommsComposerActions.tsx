'use client'

import { useEffect } from 'react'
import { IconEmoji } from 'stream-chat-react'
import { EmojiPicker } from 'stream-chat-react/emojis'
import { ensureEmojiMart } from '@/lib/comms/emoji-setup'
import { OpsCommsGiphyPicker } from '@/components/comms/OpsCommsGiphyPicker'

export function OpsCommsComposerActions() {
  useEffect(() => {
    ensureEmojiMart()
  }, [])

  return (
    <div className="ops-comms-composer-actions">
      <EmojiPicker
        ButtonIconComponent={IconEmoji}
        buttonClassName="ops-comms-composer-action"
        wrapperClassName="ops-comms-composer-action-wrap"
        pickerContainerClassName="ops-comms-emoji-picker-panel"
        closeOnEmojiSelect
        placement="top-end"
        pickerProps={{
          theme: 'dark',
          previewPosition: 'none',
          skinTonePosition: 'search',
        }}
      />
      <OpsCommsGiphyPicker />
    </div>
  )
}
