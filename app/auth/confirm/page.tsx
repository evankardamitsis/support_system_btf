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
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Signing you in…
    </div>
  )
}
