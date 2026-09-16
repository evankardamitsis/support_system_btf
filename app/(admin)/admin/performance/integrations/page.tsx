import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { PerformanceAccountPicker } from '@/components/performance/PerformanceControls'
import {
  PerformanceIntegrations,
  PerformanceWorkspaceSetup,
} from '@/components/performance/PerformanceIntegrations'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createClient } from '@/lib/supabase/server'
import { isGoogleOAuthConfigured } from '@/lib/performance/google-oauth'
import { isMetaOAuthConfigured } from '@/lib/performance/meta-oauth'
import { getPerformanceAccounts } from '@/lib/performance/service'
import { isShopifyOAuthConfigured } from '@/lib/performance/shopify-oauth'
import { createShopifyCustomPixelSnippet } from '@/lib/performance/pixel'

export default async function PerformanceIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    account?: string
    shopify?: string
    shopifyMessage?: string
    meta?: string
    metaMessage?: string
    google?: string
    googleMessage?: string
  }>
}) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) redirect('/admin/performance')
  const {
    account: requestedAccount,
    shopify,
    shopifyMessage,
    meta,
    metaMessage,
    google,
    googleMessage,
  } = await searchParams
  const supabase = await createClient()

  let accounts = [] as Awaited<ReturnType<typeof getPerformanceAccounts>>
  try {
    accounts = await getPerformanceAccounts(supabase)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Performance tables are unavailable'
    return (
      <div className="performance-layout">
        <PageHeader title="Performance integrations" description="Secure data connections for each retainer." />
        <div className="performance-empty-account">
          <h2>Apply migration 053</h2>
          <p>{message}</p>
        </div>
      </div>
    )
  }

  const account = accounts.find(item => item.id === requestedAccount) || accounts[0] || null
  const { data: allClients } = await supabase.from('clients').select('id, name').order('name')
  const accountClientIds = new Set(accounts.map(item => item.clientId))
  const availableClients = (allClients || []).filter(client => !accountClientIds.has(client.id))

  if (!account) {
    return (
      <div className="performance-layout">
        <PageHeader
          title="Performance integrations"
          description="Create the first workspace, then connect its commerce and acquisition sources."
        />
        <PerformanceWorkspaceSetup clients={availableClients} />
      </div>
    )
  }

  const { data: connectionRows, error } = await supabase
    .from('performance_connections')
    .select('id, account_id, provider, status, label, external_account_id, last_synced_at, last_error')
    .eq('account_id', account.id)
    .order('provider')
  if (error) throw new Error(error.message)
  const connections = (connectionRows || []).map(row => ({
    id: row.id,
    accountId: row.account_id,
    provider: row.provider,
    status: row.status,
    label: row.label,
    externalAccountId: row.external_account_id,
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
  }))

  return (
    <div className="performance-layout">
      <div className="performance-heading-row">
        <PageHeader
          title="Performance integrations"
          description="Verify, encrypt, and monitor every source feeding the live dashboard."
        />
        <PerformanceAccountPicker
          accounts={accounts.map(item => ({ id: item.id, displayName: item.displayName }))}
          value={account.id}
        />
      </div>
      <section className="performance-security-note">
        <span>01</span>
        <div><strong>Server-side only</strong><p>Provider secrets are encrypted at rest and never returned to the browser after saving.</p></div>
        <span>02</span>
        <div><strong>Read access</strong><p>Use the narrowest reporting scopes available. The dashboard does not create ads or edit store data.</p></div>
      </section>
      {shopifyMessage ? (
        <p className={`performance-integration-notice is-${shopify === 'connected' ? 'success' : 'error'}`} role="status">
          {shopify === 'connected' ? 'Shopify ready' : 'Shopify connection'} · {shopifyMessage}
        </p>
      ) : null}
      {metaMessage ? (
        <p className={`performance-integration-notice is-${meta === 'connected' ? 'success' : 'error'}`} role="status">
          {meta === 'connected' ? 'Meta Ads ready' : 'Meta Ads connection'} · {metaMessage}
        </p>
      ) : null}
      {googleMessage ? (
        <p className={`performance-integration-notice is-${google === 'connected' ? 'success' : 'error'}`} role="status">
          {google === 'connected' ? 'Google Ads ready' : 'Google Ads connection'} · {googleMessage}
        </p>
      ) : null}
      <PerformanceIntegrations
        account={account}
        connections={connections}
        pixelSnippet={createShopifyCustomPixelSnippet(
          account.id,
          process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
        )}
        oauthReadiness={{
          shopify: isShopifyOAuthConfigured(),
          meta: isMetaOAuthConfigured(),
          google: isGoogleOAuthConfigured(),
        }}
      />
      {availableClients.length ? <PerformanceWorkspaceSetup clients={availableClients} /> : null}
    </div>
  )
}
