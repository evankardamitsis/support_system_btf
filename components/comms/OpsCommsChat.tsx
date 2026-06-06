'use client'

import 'stream-chat-react/dist/css/index.css'

import { useEffect } from 'react'
import {
  Channel,
  ChannelHeader,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  Window,
} from 'stream-chat-react'
import type { StreamChat as StreamChatClient } from 'stream-chat'
import type { StreamCommsCredentials } from '@/lib/comms/stream-server'

type OpsCommsChatProps = {
  chatClient: StreamChatClient
  credentials: StreamCommsCredentials
}

export function OpsCommsChat({ chatClient, credentials }: OpsCommsChatProps) {
  useEffect(() => {
    let cancelled = false

    async function watchTeamChannel() {
      const channel = chatClient.channel('messaging', credentials.teamChannelId)
      await channel.watch()
      if (cancelled) return
    }

    void watchTeamChannel()

    return () => {
      cancelled = true
    }
  }, [chatClient, credentials.teamChannelId])

  return (
    <div className="ops-comms-chat">
      <Chat client={chatClient} theme="str-chat__theme-dark">
        <Channel channel={chatClient.channel('messaging', credentials.teamChannelId)}>
          <Window>
            <ChannelHeader />
            <MessageList />
            <MessageComposer />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  )
}
