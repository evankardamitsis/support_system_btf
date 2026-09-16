import { PerformanceHQ } from '@/components/performance/PerformanceHQ'
import { requirePerformanceViewer } from '@/lib/auth/require-performance-viewer'
import { getPerformanceDashboard } from '@/lib/performance/service'

export default async function ClientPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range } = await searchParams
  const { admin, accountId } = await requirePerformanceViewer()
  const data = await getPerformanceDashboard(admin, {
    accountId,
    rangeDays: Number(range || 30),
  })

  return (
    <div className="performance-route w-full min-w-0">
      <PerformanceHQ data={data} view="client" />
    </div>
  )
}
