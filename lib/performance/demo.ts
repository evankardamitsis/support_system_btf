import 'server-only'

import { summarizePerformance } from './service'
import type {
  DailyPerformanceMetric,
  PerformanceAccount,
  PerformanceConnection,
  PerformanceDashboardData,
  PerformanceEntityMetric,
  PerformanceProvider,
} from './types'

const account: PerformanceAccount = {
  id: 'preview-sasha-elage',
  clientId: 'preview-client-sasha-elage',
  clientName: 'Sasha Elage',
  displayName: 'Sasha Elage',
  currency: 'EUR',
  timezone: 'Europe/Athens',
  targetRoas: 3.5,
  targetCpa: 24,
  isActive: true,
}

function isoDate(daysAgo: number) {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

function row(
  date: string,
  provider: PerformanceProvider,
  values: Partial<Omit<DailyPerformanceMetric, 'date' | 'provider' | 'currency'>>
): DailyPerformanceMetric {
  return {
    date,
    provider,
    revenue: 0,
    spend: 0,
    orders: 0,
    conversions: 0,
    impressions: 0,
    clicks: 0,
    sessions: 0,
    newCustomers: 0,
    currency: account.currency,
    raw: {},
    ...values,
  }
}

function sampleRows(days: number, offset = 0) {
  const rows: DailyPerformanceMetric[] = []
  for (let index = days - 1; index >= 0; index -= 1) {
    const age = index + offset
    const wave = Math.sin(age * 0.72) * 0.09
    const lift = offset ? 0.88 : 1
    const revenue = Math.round((2180 + (days - index) * 16) * (1 + wave) * lift)
    const orders = Math.max(18, Math.round(revenue / 94))
    const metaSpend = Math.round((382 + Math.cos(age * 0.55) * 34) * lift)
    const googleSpend = Math.round((246 + Math.sin(age * 0.39) * 27) * lift)
    const date = isoDate(age)

    rows.push(
      row(date, 'shopify', { revenue, orders, conversions: orders, sessions: 1180 + index * 5, newCustomers: Math.round(orders * 0.62), raw: { pageviews: 2380 + index * 8, cartSessions: 182 + index, checkoutSessions: 94 + index, purchaseSessions: orders } }),
      row(date, 'meta', { spend: metaSpend, revenue: Math.round(metaSpend * 2.9), conversions: Math.round(metaSpend / 22), impressions: 38600 + index * 180, clicks: 1040 + index * 7 }),
      row(date, 'google', { spend: googleSpend, revenue: Math.round(googleSpend * 3.8), conversions: Math.round(googleSpend / 18), impressions: 19400 + index * 120, clicks: 820 + index * 5 }),
      row(date, 'klaviyo', { revenue: Math.round(revenue * 0.24), orders: Math.round(orders * 0.22), conversions: Math.round(orders * 0.22) })
    )
  }
  return rows
}

function sampleEntities(): PerformanceEntityMetric[] {
  const date = isoDate(0)
  const base = { date, parentId: null, parentName: null, sessions: 0, delivered: 0, opens: 0, unsubscribes: 0, currency: account.currency, raw: {} }
  return [
    { ...base, provider: 'meta', entityType: 'ad', entityId: 'meta-ugc-01', entityName: 'UGC · Morning routine', parentName: 'Prospecting · Broad', revenue: 8420, spend: 1870, orders: 0, conversions: 76, impressions: 182400, clicks: 4820 },
    { ...base, provider: 'meta', entityType: 'ad', entityId: 'meta-static-02', entityName: 'Static · Proof stack', parentName: 'Retargeting · 30D', revenue: 4920, spend: 980, orders: 0, conversions: 41, impressions: 76400, clicks: 2410 },
    { ...base, provider: 'google', entityType: 'ad', entityId: 'google-search-01', entityName: 'Brand search', parentName: 'Search · Brand', revenue: 6180, spend: 940, orders: 0, conversions: 52, impressions: 28400, clicks: 3200 },
    { ...base, provider: 'shopify', entityType: 'product', entityId: 'product-01', entityName: 'Signature Set', revenue: 18420, spend: 0, orders: 164, conversions: 212, impressions: 0, clicks: 0 },
    { ...base, provider: 'shopify', entityType: 'product', entityId: 'product-02', entityName: 'Daily Essential', revenue: 12780, spend: 0, orders: 138, conversions: 151, impressions: 0, clicks: 0 },
    { ...base, provider: 'shopify', entityType: 'traffic_source', entityId: 'social', entityName: 'Social', revenue: 0, spend: 0, orders: 0, conversions: 88, impressions: 0, clicks: 0, sessions: 8420, raw: { cartSessions: 724, checkoutSessions: 381 } },
    { ...base, provider: 'shopify', entityType: 'traffic_source', entityId: 'direct', entityName: 'Direct', revenue: 0, spend: 0, orders: 0, conversions: 64, impressions: 0, clicks: 0, sessions: 5180, raw: { cartSessions: 516, checkoutSessions: 272 } },
    { ...base, provider: 'shopify', entityType: 'marketing_channel', entityId: 'social', entityName: 'Social', revenue: 18940, spend: 0, orders: 168, conversions: 168, impressions: 0, clicks: 0, raw: { firstClickRevenue: 22680, attribution: 'shopify_last_click' } },
    { ...base, provider: 'shopify', entityType: 'marketing_channel', entityId: 'search', entityName: 'Search', revenue: 14280, spend: 0, orders: 121, conversions: 121, impressions: 0, clicks: 0, raw: { firstClickRevenue: 11940, attribution: 'shopify_last_click' } },
    { ...base, provider: 'klaviyo', entityType: 'klaviyo_flow', entityId: 'flow-welcome', entityName: 'Welcome Series', revenue: 5860, spend: 0, orders: 0, conversions: 54, impressions: 8400, clicks: 1170, delivered: 8170, opens: 4920, unsubscribes: 18 },
    { ...base, provider: 'klaviyo', entityType: 'klaviyo_flow', entityId: 'flow-abandon', entityName: 'Abandoned Checkout', revenue: 7420, spend: 0, orders: 0, conversions: 67, impressions: 4100, clicks: 880, delivered: 3970, opens: 2540, unsubscribes: 7 },
    { ...base, provider: 'klaviyo', entityType: 'klaviyo_campaign', entityId: 'campaign-drop', entityName: 'September Drop', revenue: 4280, spend: 0, orders: 0, conversions: 38, impressions: 12600, clicks: 1040, delivered: 12180, opens: 5980, unsubscribes: 31 },
  ]
}

export function getSashaPerformancePreview(rangeDays: number): PerformanceDashboardData {
  const safeRange = [7, 14, 30, 90].includes(rangeDays) ? rangeDays : 30
  const now = new Date().toISOString()
  const providers: PerformanceProvider[] = ['shopify', 'meta', 'google', 'klaviyo']
  const connections: PerformanceConnection[] = providers.map(provider => ({
    id: `preview-${provider}`,
    accountId: account.id,
    provider,
    status: 'connected',
    label: provider === 'google' ? 'Google Ads' : `${provider[0].toUpperCase()}${provider.slice(1)}`,
    externalAccountId: `sasha-${provider}`,
    lastSyncedAt: now,
    lastError: null,
  }))
  const daily = sampleRows(safeRange)
  const previous = sampleRows(safeRange, safeRange)
  const entities = sampleEntities()
  const webDaily = Array.from({ length: safeRange }, (_, index) => ({
    date: isoDate(safeRange - index - 1),
    pageviews: 2450 + index * 16,
    sessions: 1180 + index * 7,
    productViewSessions: 810 + index * 4,
    cartSessions: 190 + index * 2,
    checkoutSessions: 96 + index,
    purchaseSessions: 25 + Math.round(index * 0.2),
  }))
  const pages = [
    { date: isoDate(0), path: '/', title: 'Sasha Elage', pageviews: 9840, sessions: 6110 },
    { date: isoDate(0), path: '/collections/bestsellers', title: 'Bestsellers', pageviews: 7240, sessions: 4380 },
    { date: isoDate(0), path: '/products/signature-set', title: 'Signature Set', pageviews: 5680, sessions: 3290 },
    { date: isoDate(0), path: '/collections/new', title: 'New arrivals', pageviews: 3190, sessions: 2140 },
  ]
  const utmCampaigns = [
    { date: isoDate(0), source: 'meta', medium: 'paid_social', campaign: 'September Prospecting', purchases: 42, revenue: 4860 },
    { date: isoDate(0), source: 'klaviyo', medium: 'email', campaign: 'Welcome Series', purchases: 19, revenue: 2120 },
  ]

  return {
    account,
    accounts: [account],
    connections,
    daily,
    entities,
    webDaily,
    pages,
    utmCampaigns,
    summary: summarizePerformance(daily, entities),
    previousSummary: summarizePerformance(previous),
    rangeDays: safeRange,
    lastSyncedAt: now,
    isPreview: true,
  }
}
