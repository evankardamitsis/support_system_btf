'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      router.replace(`/auth/login?error=${encodeURIComponent(errorDescription ?? error)}`)
      return
    }

    if (accessToken && refreshToken) {
      const supabase = createClient()
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
        if (type === 'recovery') {
          router.replace('/auth/update-password')
        } else {
          router.replace('/')
        }
      })
    }
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono tracking-[0.2em] text-zinc-500 uppercase">BTF</span>
        <span className="w-px h-3 bg-zinc-800" />
        <span className="text-xs tracking-wide text-zinc-600">Support</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-block w-4 h-4 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
        <span className="text-sm text-zinc-400">Signing you in…</span>
      </div>
    </div>
  )
}
