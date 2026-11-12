import { renderToBuffer } from '@react-pdf/renderer'
import { BTF_OFFER_LOGO_SRC } from '@/lib/ops/financial-offer/assets'
import type { PerformanceDashboardData } from '@/lib/performance/types'
import { PerformanceReportDocument } from './PerformanceReportDocument'

export async function renderPerformanceReportPdf(data: PerformanceDashboardData): Promise<Buffer> {
  const buffer = await renderToBuffer(<PerformanceReportDocument data={data} logoSrc={BTF_OFFER_LOGO_SRC} />)
  return Buffer.from(buffer)
}

export function performanceReportFilename(data: PerformanceDashboardData) {
  const name = (data.account?.displayName || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const date = new Date().toISOString().slice(0, 10)
  return `btf-performance-${name}-${data.rangeDays}d-${date}.pdf`
}
