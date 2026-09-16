import { NextRequest, NextResponse } from 'next/server'
import { syncAllPerformanceAccounts } from '@/lib/performance/service'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncAllPerformanceAccounts()
    return NextResponse.json({ ok: true, accounts: result })
  } catch (cause) {
    return NextResponse.json(
      { ok: false, error: cause instanceof Error ? cause.message : 'Performance sync failed' },
      { status: 500 }
    )
  }
}

