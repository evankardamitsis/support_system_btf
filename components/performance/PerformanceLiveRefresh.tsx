'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function PerformanceLiveRefresh({ accountId }: { accountId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`performance:${accountId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performance_daily_metrics',
          filter: `account_id=eq.${accountId}`,
        },
        () => router.refresh()
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [accountId, router])

  return null
}

