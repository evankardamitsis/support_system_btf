'use client'

import { useState } from 'react'
import { generateInviteLink } from '@/app/actions/clients'
import { CopyInput } from '@/components/ui/CopyInput'

export function GenerateInviteSection({ clientId }: { clientId: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const url = await generateInviteLink(clientId)
      setLink(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn-ghost px-4 py-2 text-[10px] tracking-[0.12em] uppercase cursor-pointer disabled:opacity-50"
        style={{
          fontFamily: 'var(--font-dm-mono)',
          color: 'var(--text-2)',
          border: '1px solid var(--border)',
          borderRadius: 0,
          background: 'transparent',
        }}
      >
        {loading ? '...' : 'GENERATE INVITE LINK'}
      </button>
      {link ? (
        <div className="w-full max-w-sm space-y-2 text-right">
          <CopyInput value={link} />
          <p className="dash-meta leading-relaxed">
            Open in a private window to register a real portal user. Login uses this client&apos;s
            account email. Link expires in 7 days, one use.
          </p>
        </div>
      ) : null}
    </div>
  )
}
