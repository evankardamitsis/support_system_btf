import { NextRequest, NextResponse } from 'next/server'
import { processHostingRenewalReminders } from '@/lib/ops/hosting-maintenance/reminders'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processHostingRenewalReminders()
  return NextResponse.json(result)
}
