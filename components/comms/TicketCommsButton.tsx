'use client'

import { useState } from 'react'
import { OpsCommsFabIcon } from '@/components/comms/OpsCommsFabIcon'
import { useComms } from '@/lib/comms/comms-context'
import { notifyError } from '@/lib/notify'

type TicketCommsButtonProps = {
  ticketId: string
}

export function TicketCommsButton({ ticketId }: TicketCommsButtonProps) {
  const { openComms } = useComms()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const response = await fetch(`/api/comms/channels/ticket/${ticketId}`, {
        method: 'POST',
      })
      const body = (await response.json().catch(() => null)) as
        | { channelId?: string; error?: string }
        | null

      if (!response.ok || !body?.channelId) {
        notifyError(body?.error ?? 'Could not open COMMS')
        return
      }

      openComms(body.channelId)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className="ticket-comms-button"
      disabled={loading}
      aria-label={loading ? 'Opening COMMS' : 'Open COMMS'}
      onClick={() => void handleClick()}
    >
      <span className="ticket-comms-button-inner">
        <OpsCommsFabIcon className="ticket-comms-button-icon" />
        <span className="ticket-comms-button-label">{loading ? '…' : 'COMMS'}</span>
      </span>
    </button>
  )
}
