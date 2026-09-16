export const PERFORMANCE_PROVIDERS = ['shopify', 'meta', 'google', 'klaviyo'] as const

export type PerformanceProvider = (typeof PERFORMANCE_PROVIDERS)[number]
export type PerformanceConnectionStatus = 'disconnected' | 'connected' | 'error'

export type PerformanceAccount = {
  id: string
  clientId: string
  clientName: string
  displayName: string
  currency: string
  timezone: string
  targetRoas: number | null
  targetCpa: number | null
  isActive: boolean
}

export type PerformanceConnection = {
  id: string
  accountId: string
  provider: PerformanceProvider
  status: PerformanceConnectionStatus
  label: string | null
  externalAccountId: string | null
  lastSyncedAt: string | null
  lastError: string | null
}

export type DailyPerformanceMetric = {
  date: string
  provider: PerformanceProvider
  revenue: number
  spend: number
  orders: number
  conversions: number
  impressions: number
  clicks: number
  sessions: number
  newCustomers: number
  currency: string
  raw: Record<string, unknown>
}

export type PerformanceSummary = {
  revenue: number
  spend: number
  orders: number
  conversions: number
  impressions: number
  clicks: number
  newCustomers: number
  roas: number | null
  cpa: number | null
  ctr: number | null
  conversionRate: number | null
  aov: number | null
  cpc: number | null
  cpm: number | null
  newCustomerRate: number | null
  emailRevenue: number
  emailConversions: number
}

export const PERFORMANCE_ENTITY_TYPES = ['ad', 'product', 'landing_page', 'traffic_source', 'marketing_channel', 'klaviyo_campaign', 'klaviyo_flow'] as const
export type PerformanceEntityType = (typeof PERFORMANCE_ENTITY_TYPES)[number]

export type PerformanceEntityMetric = {
  date: string
  provider: PerformanceProvider
  entityType: PerformanceEntityType
  entityId: string
  entityName: string
  parentId: string | null
  parentName: string | null
  revenue: number
  spend: number
  orders: number
  conversions: number
  impressions: number
  clicks: number
  sessions: number
  delivered: number
  opens: number
  unsubscribes: number
  currency: string
  raw: Record<string, unknown>
}

export type PerformanceDashboardData = {
  account: PerformanceAccount | null
  accounts: PerformanceAccount[]
  connections: PerformanceConnection[]
  daily: DailyPerformanceMetric[]
  entities: PerformanceEntityMetric[]
  webDaily: PerformanceWebDailyMetric[]
  pages: PerformancePageMetric[]
  utmCampaigns: PerformanceUtmCampaignMetric[]
  summary: PerformanceSummary
  previousSummary: PerformanceSummary
  rangeDays: number
  lastSyncedAt: string | null
  isPreview?: boolean
}

export type PerformanceWebDailyMetric = {
  date: string
  pageviews: number
  sessions: number
  productViewSessions: number
  cartSessions: number
  checkoutSessions: number
  purchaseSessions: number
}

export type PerformancePageMetric = {
  date: string
  path: string
  title: string | null
  pageviews: number
  sessions: number
}

export type PerformanceUtmCampaignMetric = {
  date: string
  source: string | null
  medium: string | null
  campaign: string
  purchases: number
  revenue: number
}

export type ProviderSyncRow = Omit<DailyPerformanceMetric, 'provider'>

export type ProviderEntitySyncRow = Omit<PerformanceEntityMetric, 'provider'>

export type ProviderSyncResult = {
  daily: ProviderSyncRow[]
  entities: ProviderEntitySyncRow[]
  warnings?: string[]
}

export type ShopifyCredentials = {
  shop: string
  accessToken: string
  apiVersion?: string
  scopes?: string[]
}

export type MetaCredentials = {
  adAccountId: string
  accessToken: string
  graphVersion?: string
  expiresAt?: string
}

export type GoogleCredentials = {
  customerId: string
  loginCustomerId?: string
  developerToken?: string
  clientId: string
  clientSecret: string
  refreshToken: string
  apiVersion?: string
}

export type KlaviyoCredentials = {
  privateApiKey: string
  revision?: string
  timezone?: string
}

export type ProviderCredentials =
  | ShopifyCredentials
  | MetaCredentials
  | GoogleCredentials
  | KlaviyoCredentials
