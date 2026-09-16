import type { PerformanceProvider } from './types'

export type ProviderField = {
  key: string
  label: string
  type?: 'text' | 'password'
  placeholder?: string
  required?: boolean
  help?: string
}

export type ProviderDefinition = {
  id: PerformanceProvider
  name: string
  shortName: string
  description: string
  accent: string
  fields: ProviderField[]
}

export const PERFORMANCE_PROVIDER_CATALOG: ProviderDefinition[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    shortName: 'Shop',
    description: 'Net sales, orders, AOV, and new customers from the store.',
    accent: '#95bf47',
    fields: [
      { key: 'shop', label: 'Store domain', placeholder: 'store.myshopify.com', required: true },
      {
        key: 'accessToken',
        label: 'Admin API access token',
        type: 'password',
        placeholder: 'shpat_••••••••',
        required: true,
        help: 'Requires read_orders, read_customers, and read_products. Tokens are encrypted before storage.',
      },
      { key: 'apiVersion', label: 'API version', placeholder: '2026-07' },
    ],
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    shortName: 'Meta',
    description: 'Spend, reach, clicks, purchases, and attributed revenue.',
    accent: '#58a6ff',
    fields: [
      { key: 'adAccountId', label: 'Ad account ID', placeholder: '420647623853783', required: true },
      {
        key: 'accessToken',
        label: 'Long-lived access token',
        type: 'password',
        placeholder: 'EAAB••••••••',
        required: true,
        help: 'Manual fallback: use a long-lived or system-user token with ads_read access.',
      },
      { key: 'graphVersion', label: 'Graph version', placeholder: 'v26.0' },
    ],
  },
  {
    id: 'google',
    name: 'Google Ads',
    shortName: 'Google',
    description: 'Search and Shopping spend, conversions, value, and traffic.',
    accent: '#fbbc04',
    fields: [
      { key: 'customerId', label: 'Customer ID', placeholder: '1234567890', required: true },
      { key: 'loginCustomerId', label: 'Manager customer ID', placeholder: 'Optional MCC ID' },
      {
        key: 'developerToken',
        label: 'Legacy developer token',
        type: 'password',
        help: 'Optional for migrated Google Cloud projects; retained for older integrations.',
      },
      { key: 'clientId', label: 'OAuth client ID', required: true },
      { key: 'clientSecret', label: 'OAuth client secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'OAuth refresh token', type: 'password', required: true },
      { key: 'apiVersion', label: 'API version', placeholder: 'v25' },
    ],
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    shortName: 'Klaviyo',
    description: 'Tracked orders plus attributed newsletter and automated-flow performance.',
    accent: '#ff7a00',
    fields: [
      {
        key: 'privateApiKey',
        label: 'Private API key',
        type: 'password',
        placeholder: 'pk_••••••••',
        required: true,
        help: 'Create a read-only key with metrics:read, campaigns:read, and flows:read.',
      },
      { key: 'revision', label: 'API revision', placeholder: '2026-07-15' },
      { key: 'timezone', label: 'Reporting timezone', placeholder: 'Europe/Athens' },
    ],
  },
]

export function getProviderDefinition(provider: PerformanceProvider) {
  return PERFORMANCE_PROVIDER_CATALOG.find(item => item.id === provider)!
}
