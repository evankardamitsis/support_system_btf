import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isBtfStaffRole } from '@/lib/auth/staff'
import { getPerformanceDashboard } from '@/lib/performance/service'
import { performanceReportFilename, renderPerformanceReportPdf } from '@/lib/performance/report/render'

export const runtime = 'nodejs'

/** One-page A4 PDF of the selected performance workspace. Staff only. */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!isBtfStaffRole(profile?.role)) return new Response('Forbidden', { status: 403 })

  const accountId = request.nextUrl.searchParams.get('account') || undefined
  const rangeDays = Number(request.nextUrl.searchParams.get('range') || 30)

  try {
    const data = await getPerformanceDashboard(supabase, { accountId, rangeDays })
    if (!data.account) return new Response('Performance workspace not found', { status: 404 })
    const pdf = await renderPerformanceReportPdf(data)
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${performanceReportFilename(data)}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[performance-report] PDF render failed:', err)
    return new Response('Could not generate the performance report', { status: 500 })
  }
}
