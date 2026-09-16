import type { DailyPerformanceMetric } from '@/lib/performance/types'
import { formatPerformanceCurrency } from '@/lib/performance/display'

type ChartPoint = { date: string; revenue: number; spend: number }

function chartPoints(rows: DailyPerformanceMetric[]): ChartPoint[] {
  const dates = new Map<string, DailyPerformanceMetric[]>()
  for (const row of rows) dates.set(row.date, [...(dates.get(row.date) || []), row])
  return [...dates.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => {
      const shopify = items.filter(item => item.provider === 'shopify')
      const klaviyo = items.filter(item => item.provider === 'klaviyo')
      const commerce = shopify.length ? shopify : klaviyo
      return {
        date,
        revenue: commerce.reduce((sum, item) => sum + item.revenue, 0),
        spend: items
          .filter(item => item.provider === 'meta' || item.provider === 'google')
          .reduce((sum, item) => sum + item.spend, 0),
      }
    })
}

function linePath(values: number[], max: number, width = 760, height = 208) {
  if (!values.length) return ''
  const step = values.length === 1 ? 0 : width / (values.length - 1)
  return values
    .map((value, index) => {
      const x = 20 + index * step
      const y = 22 + height - (value / max) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export function PerformanceChart({ rows, currency }: { rows: DailyPerformanceMetric[]; currency: string }) {
  const points = chartPoints(rows)
  const max = Math.max(1, ...points.flatMap(point => [point.revenue, point.spend]))
  const revenuePath = linePath(points.map(point => point.revenue), max)
  const spendPath = linePath(points.map(point => point.spend), max)

  if (!points.length) {
    return (
      <div className="performance-chart-empty">
        <span className="performance-chart-empty-line" aria-hidden />
        <p>No performance signal yet</p>
        <span>Connect a source, then run the first sync.</span>
      </div>
    )
  }

  const first = points[0]
  const last = points.at(-1)!
  return (
    <div className="performance-chart-wrap">
      <div className="performance-chart-legend" aria-hidden>
        <span><i className="is-revenue" /> Revenue</span>
        <span><i className="is-spend" /> Ad spend</span>
      </div>
      <svg className="performance-chart" viewBox="0 0 800 260" role="img" aria-label="Revenue and ad spend over time">
        <defs>
          <linearGradient id="performanceRevenueFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#e8ff47" stopOpacity="0.22" />
            <stop offset="1" stopColor="#e8ff47" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map(index => (
          <line key={index} x1="20" x2="780" y1={22 + index * 52} y2={22 + index * 52} className="performance-chart-grid" />
        ))}
        <path d={`${revenuePath} L 780 230 L 20 230 Z`} fill="url(#performanceRevenueFill)" />
        <path d={revenuePath} className="performance-chart-line is-revenue" />
        <path d={spendPath} className="performance-chart-line is-spend" />
      </svg>
      <div className="performance-chart-axis">
        <span>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(`${first.date}T00:00:00`))}</span>
        <strong>{formatPerformanceCurrency(max, currency, true)} peak</strong>
        <span>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(`${last.date}T00:00:00`))}</span>
      </div>
    </div>
  )
}

