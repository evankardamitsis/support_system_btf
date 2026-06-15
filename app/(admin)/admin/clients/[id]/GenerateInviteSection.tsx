'use client'

import { useState } from 'react'
import { generateInviteLink } from '@/app/actions/clients'
import { CopyInput } from '@/components/ui/CopyInput'
import { notifyError, notifySuccess } from '@/lib/notify'

export function GenerateInviteSection({ clientId }: { clientId: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const result = await generateInviteLink(clientId)
      if (!result.ok) {
        notifyError(result.error)
        return
      }
      setLink(result.url)
      if (result.emailSent) {
        notifySuccess('Portal invite emailed to the client contact')
      } else {
        notifySuccess('Invite link generated')
        if (result.emailError) {
          notifyError(result.emailError)
        }
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Could not generate invite link')
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
        {loading ? 'Generating…' : 'Generate invite link'}
      </button>
      {link ? (
        <div className="w-full max-w-sm space-y-2 text-right">
          <CopyInput value={link} />
          <p className="dash-meta leading-relaxed">
            We email this link to the client&apos;s contact address. You can also copy it. Login uses
            this client&apos;s account email. Link expires in 7 days, one use.
          </p>
        </div>
      ) : null}
    </div>
  )
}
