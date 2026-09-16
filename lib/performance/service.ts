import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/database.types'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptPerformanceCredentials } from './crypto'
import { syncProviderMetrics } from './providerAdapters'
import type {
  DailyPerformanceMetric,
  PerformanceAccount,
  PerformanceConnection,
  PerformanceDashboardData,
  PerformanceEntityMetric,
  PerformancePageMetric,
  PerformanceProvider,
  PerformanceSummary,
  PerformanceUtmCampaignMetric,
  PerformanceWebDailyMetric,
} from './types'

type DbClient = SupabaseClient<Database>

function number(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function daysAgo(days: number) {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - days)
  return isoDate(date)
}

function emptySummary(): PerformanceSummary {
  return {
    revenue: 0,
    spend: 0,
    orders: 0,
    conversions: 0,
    impressions: 0,
    clicks: 0,
    newCustomers: 0,
    roas: null,
    cpa: null,
    ctr: null,
    conversionRate: null,
    aov: null,
    cpc: null,
    cpm: null,
    newCustomerRate: null,
    emailRevenue: 0,
    emailConversions: 0,
  }
}

export function summarizePerformance(rows: DailyPerformanceMetric[], entities: PerformanceEntityMetric[] = []): PerformanceSummary {
  if (!rows.length) return emptySummary()

  const shopify = rows.filter(row => row.provider === 'shopify')
  const klaviyo = rows.filter(row => row.provider === 'klaviyo')
  const ads = rows.filter(row => row.provider === 'meta' || row.provider === 'google')
  const commerce = shopify.length ? shopify : klaviyo

  const revenue = commerce.reduce((sum, row) => sum + row.revenue, 0)
  const orders = commerce.reduce((sum, row) => sum + (row.orders || row.conversions), 0)
  const newCustomers = commerce.reduce((sum, row) => sum + row.newCustomers, 0)
  const spend = ads.reduce((sum, row) => sum + row.spend, 0)
  const conversions = ads.reduce((sum, row) => sum + row.conversions, 0)
  const impressions = ads.reduce((sum, row) => sum + row.impressions, 0)
  const clicks = ads.reduce((sum, row) => sum + row.clicks, 0)
  const lifecycle = entities.filter(row => row.entityType === 'klaviyo_campaign' || row.entityType === 'klaviyo_flow')
  const emailRevenue = lifecycle.reduce((sum, row) => sum + row.revenue, 0)
  const emailConversions = lifecycle.reduce((sum, row) => sum + row.conversions, 0)

  return {
    revenue,
    spend,
    orders,
    conversions,
    impressions,
    clicks,
    newCustomers,
    roas: spend > 0 ? revenue / spend : null,
    cpa: conversions > 0 ? spend / conversions : null,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    conversionRate: clicks > 0 ? (conversions / clicks) * 100 : null,
    aov: orders > 0 ? revenue / orders : null,
    cpc: clicks > 0 ? spend / clicks : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    newCustomerRate: orders > 0 ? (newCustomers / orders) * 100 : null,
    emailRevenue,
    emailConversions,
  }
}

function mapAccount(
  row: Database['public']['Tables']['performance_accounts']['Row'],
  clientName: string
): PerformanceAccount {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName,
    displayName: row.display_name,
    currency: row.currency,
    timezone: row.timezone,
    targetRoas: row.target_roas === null ? null : number(row.target_roas),
    targetCpa: row.target_cpa === null ? null : number(row.target_cpa),
    isActive: row.is_active,
  }
}

function mapConnection(
  row: Database['public']['Tables']['performance_connections']['Row']
): PerformanceConnection {
  return {
    id: row.id,
    accountId: row.account_id,
    provider: row.provider,
    status: row.status,
    label: row.label,
    externalAccountId: row.external_account_id,
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
  }
}

function mapMetric(
  row: Database['public']['Tables']['performance_daily_metrics']['Row']
): DailyPerformanceMetric {
  return {
    date: row.metric_date,
    provider: row.provider,
    revenue: number(row.revenue),
    spend: number(row.spend),
    orders: number(row.orders),
    conversions: number(row.conversions),
    impressions: number(row.impressions),
    clicks: number(row.clicks),
    sessions: number(row.sessions),
    newCustomers: number(row.new_customers),
    currency: row.currency,
    raw: (row.raw_payload || {}) as Record<string, unknown>,
  }
}

function mapWebDaily(
  row: Database['public']['Views']['performance_web_daily_rollup']['Row']
): PerformanceWebDailyMetric {
  return {
    date: row.metric_date || '',
    pageviews: number(row.pageviews),
    sessions: number(row.sessions),
    productViewSessions: number(row.product_view_sessions),
    cartSessions: number(row.cart_sessions),
    checkoutSessions: number(row.checkout_sessions),
    purchaseSessions: number(row.purchase_sessions),
  }
}

function mapPage(
  row: Database['public']['Views']['performance_page_rollup']['Row']
): PerformancePageMetric {
  return {
    date: row.metric_date || '',
    path: row.page_path || '/',
    title: row.page_title,
    pageviews: number(row.pageviews),
    sessions: number(row.sessions),
  }
}

function mapUtmCampaign(
  row: Database['public']['Views']['performance_utm_campaign_sales_rollup']['Row']
): PerformanceUtmCampaignMetric {
  return {
    date: row.metric_date || '',
    source: row.utm_source,
    medium: row.utm_medium,
    campaign: row.utm_campaign || '(untagged)',
    purchases: number(row.purchases),
    revenue: number(row.revenue),
  }
}

function mapEntity(
  row: Database['public']['Tables']['performance_entity_metrics']['Row']
): PerformanceEntityMetric {
  return {
    date: row.metric_date,
    provider: row.provider,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    parentId: row.parent_id,
    parentName: row.parent_name,
    revenue: number(row.revenue),
    spend: number(row.spend),
    orders: number(row.orders),
    conversions: number(row.conversions),
    impressions: number(row.impressions),
    clicks: number(row.clicks),
    sessions: number(row.sessions),
    delivered: number(row.delivered),
    opens: number(row.opens),
    unsubscribes: number(row.unsubscribes),
    currency: row.currency,
    raw: (row.raw_payload || {}) as Record<string, unknown>,
  }
}

export async function getPerformanceAccounts(supabase: DbClient): Promise<PerformanceAccount[]> {
  const { data: accountRows, error } = await supabase
    .from('performance_accounts')
    .select('*')
    .eq('is_active', true)
    .order('display_name')
  if (error) throw new Error(error.message)

  const clientIds = [...new Set((accountRows || []).map(row => row.client_id))]
  const { data: clients } = clientIds.length
    ? await supabase.from('clients').select('id, name').in('id', clientIds)
    : { data: [] as Array<{ id: string; name: string }> }
  const names = new Map((clients || []).map(client => [client.id, client.name]))
  return (accountRows || []).map(row => mapAccount(row, names.get(row.client_id) || row.display_name))
}

export async function getPerformanceDashboard(
  supabase: DbClient,
  options: { accountId?: string; rangeDays?: number } = {}
): Promise<PerformanceDashboardData> {
  const rangeDays = [7, 14, 30, 90].includes(options.rangeDays || 30) ? options.rangeDays! : 30
  const accounts = await getPerformanceAccounts(supabase)
  const account = accounts.find(item => item.id === options.accountId) || accounts[0] || null
  if (!account) {
    return {
      account: null,
      accounts,
      connections: [],
      daily: [],
      entities: [],
      webDaily: [],
      pages: [],
      utmCampaigns: [],
      summary: emptySummary(),
      previousSummary: emptySummary(),
      rangeDays,
      lastSyncedAt: null,
    }
  }

  const currentStart = daysAgo(rangeDays - 1)
  const previousStart = daysAgo(rangeDays * 2 - 1)
  const previousEnd = daysAgo(rangeDays)
  const [
    { data: connectionRows, error: connectionsError },
    { data: metricRows, error: metricsError },
    { data: entityRows, error: entitiesError },
    { data: webDailyRows, error: webDailyError },
    { data: pageRows, error: pagesError },
    { data: utmCampaignRows, error: utmCampaignsError },
  ] =
    await Promise.all([
      supabase.from('performance_connections').select('*').eq('account_id', account.id).order('provider'),
      supabase
        .from('performance_daily_metrics')
        .select('*')
        .eq('account_id', account.id)
        .gte('metric_date', previousStart)
        .order('metric_date'),
      supabase
        .from('performance_entity_metrics')
        .select('*')
        .eq('account_id', account.id)
        .gte('metric_date', currentStart)
        .order('metric_date'),
      supabase
        .from('performance_web_daily_rollup')
        .select('*')
        .eq('account_id', account.id)
        .gte('metric_date', currentStart)
        .order('metric_date'),
      supabase
        .from('performance_page_rollup')
        .select('*')
        .eq('account_id', account.id)
        .gte('metric_date', currentStart)
        .order('metric_date'),
      supabase
        .from('performance_utm_campaign_sales_rollup')
        .select('*')
        .eq('account_id', account.id)
        .gte('metric_date', currentStart)
        .order('metric_date'),
    ])
  if (connectionsError) throw new Error(connectionsError.message)
  if (metricsError) throw new Error(metricsError.message)
  // Keep the existing aggregate dashboard available during a rolling deploy;
  // detail panels become active as soon as migration 054 is applied.
  if (entitiesError && entitiesError.code !== 'PGRST205' && !entitiesError.message.includes('schema cache')) {
    throw new Error(entitiesError.message)
  }
  for (const analyticsError of [webDailyError, pagesError, utmCampaignsError]) {
    if (analyticsError && analyticsError.code !== 'PGRST205' && !analyticsError.message.includes('schema cache')) {
      throw new Error(analyticsError.message)
    }
  }

  const connections = (connectionRows || []).map(mapConnection)
  const allMetrics = (metricRows || []).map(mapMetric)
  const daily = allMetrics.filter(row => row.date >= currentStart)
  const entities = (entityRows || []).map(mapEntity)
  const webDaily = (webDailyRows || []).map(mapWebDaily).filter(row => row.date)
  const pages = (pageRows || []).map(mapPage).filter(row => row.date)
  const utmCampaigns = (utmCampaignRows || []).map(mapUtmCampaign).filter(row => row.date)
  const previous = allMetrics.filter(row => row.date >= previousStart && row.date <= previousEnd)
  const lastSyncedAt = connections
    .map(connection => connection.lastSyncedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) || null

  return {
    account,
    accounts,
    connections,
    daily,
    entities,
    webDaily,
    pages,
    utmCampaigns,
    summary: summarizePerformance(daily, entities),
    previousSummary: summarizePerformance(previous),
    rangeDays,
    lastSyncedAt,
  }
}

export type SyncResult = {
  provider: PerformanceProvider
  ok: boolean
  rows: number
  entityRows: number
  warnings?: string[]
  error?: string
}

export async function syncPerformanceAccount(accountId: string): Promise<SyncResult[]> {
  const admin = createAdminClient()
  const { data: account, error: accountError } = await admin
    .from('performance_accounts')
    .select('id, currency')
    .eq('id', accountId)
    .single()
  if (accountError || !account) throw new Error(accountError?.message || 'Performance account not found')

  const { data: connections, error } = await admin
    .from('performance_connections')
    .select('*')
    .eq('account_id', accountId)
    .in('status', ['connected', 'error'])
  if (error) throw new Error(error.message)

  const end = isoDate(new Date())
  const start = daysAgo(30)
  const results = await Promise.all(
    (connections || []).map(async connection => {
      try {
        const credentials = decryptPerformanceCredentials(connection.credentials_encrypted)
        const result = await syncProviderMetrics(connection.provider, credentials, start, end)
        const rows = result.daily
        if (rows.length) {
          const { error: upsertError } = await admin.from('performance_daily_metrics').upsert(
            rows.map(row => ({
              account_id: accountId,
              provider: connection.provider,
              metric_date: row.date,
              revenue: row.revenue,
              spend: row.spend,
              orders: row.orders,
              conversions: row.conversions,
              impressions: row.impressions,
              clicks: row.clicks,
              sessions: row.sessions,
              new_customers: row.newCustomers,
              currency: row.currency || account.currency,
              raw_payload: (row.raw || {}) as Json,
              synced_at: new Date().toISOString(),
            })),
            { onConflict: 'account_id,provider,metric_date' }
          )
          if (upsertError) throw new Error(upsertError.message)

          if (connection.provider === 'shopify' && rows[0].currency !== account.currency) {
            const { error: currencyError } = await admin
              .from('performance_accounts')
              .update({ currency: rows[0].currency, updated_at: new Date().toISOString() })
              .eq('id', accountId)
            if (currencyError) throw new Error(currencyError.message)
          }
        }
        const { error: deleteEntitiesError } = await admin
          .from('performance_entity_metrics')
          .delete()
          .eq('account_id', accountId)
          .eq('provider', connection.provider)
          .gte('metric_date', start)
          .lte('metric_date', end)
        if (deleteEntitiesError) throw new Error(deleteEntitiesError.message)
        if (result.entities.length) {
          const { error: entityUpsertError } = await admin.from('performance_entity_metrics').upsert(
            result.entities.map(row => ({
              account_id: accountId,
              provider: connection.provider,
              metric_date: row.date,
              entity_type: row.entityType,
              entity_id: row.entityId,
              entity_name: row.entityName,
              parent_id: row.parentId,
              parent_name: row.parentName,
              revenue: row.revenue,
              spend: row.spend,
              orders: row.orders,
              conversions: row.conversions,
              impressions: row.impressions,
              clicks: row.clicks,
              sessions: row.sessions,
              delivered: row.delivered,
              opens: row.opens,
              unsubscribes: row.unsubscribes,
              currency: row.currency || account.currency,
              raw_payload: row.raw as Json,
              synced_at: new Date().toISOString(),
            })),
            { onConflict: 'account_id,provider,metric_date,entity_type,entity_id' }
          )
          if (entityUpsertError) throw new Error(entityUpsertError.message)
        }
        const syncedAt = new Date().toISOString()
        await admin
          .from('performance_connections')
          .update({ last_synced_at: syncedAt, last_error: null, status: 'connected', updated_at: syncedAt })
          .eq('id', connection.id)
        return { provider: connection.provider, ok: true, rows: rows.length, entityRows: result.entities.length, warnings: result.warnings } satisfies SyncResult
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Sync failed'
        await admin
          .from('performance_connections')
          .update({ last_error: message, status: 'error', updated_at: new Date().toISOString() })
          .eq('id', connection.id)
        return { provider: connection.provider, ok: false, rows: 0, entityRows: 0, error: message } satisfies SyncResult
      }
    })
  )
  return results
}

export async function syncAllPerformanceAccounts() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('performance_accounts')
    .select('id')
    .eq('is_active', true)
  if (error) throw new Error(error.message)

  const results = []
  for (const account of data || []) {
    results.push({ accountId: account.id, providers: await syncPerformanceAccount(account.id) })
  }
  return results
}
