'use client'

import { useState } from 'react'
import { generateInviteLink } from '@/app/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function InviteLinkButton({ clientId }: { clientId: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const url = await generateInviteLink(clientId)
      setLink(url)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleGenerate}
        disabled={loading}
        variant="outline"
        className="h-9 border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm cursor-pointer"
      >
        {loading ? 'Generating…' : 'Generate invite link'}
      </Button>
      {link && (
        <div className="flex gap-2">
          <Input
            value={link}
            readOnly
            className="h-9 border-zinc-200 bg-zinc-50 text-zinc-600 text-xs font-mono"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 px-3 h-9 border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
