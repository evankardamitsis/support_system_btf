'use client'

import { useActionState, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { Check, CircleAlert, Copy, Link2, LockKeyhole, PlugZap, ShieldCheck, Trash2 } from 'lucide-react'
import {
  createPerformanceAccount,
  disconnectPerformanceConnection,
  savePerformanceConnection,
  type PerformanceActionState,
} from '@/app/actions/performance'
import { PERFORMANCE_PROVIDER_CATALOG, type ProviderDefinition } from '@/lib/performance/catalog'
import { formatSyncTime } from '@/lib/performance/display'
import type {
  PerformanceAccount,
  PerformanceConnection,
  PerformanceProvider,
} from '@/lib/performance/types'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'

const initialState: PerformanceActionState = { ok: false, message: '' }

function SubmitButton({ idle, pending }: { idle: string; pending: string }) {
  const status = useFormStatus()
  return (
    <button className="performance-primary-button" type="submit" disabled={status.pending}>
      <PlugZap size={14} aria-hidden />
      {status.pending ? pending : idle}
    </button>
  )
}

function ActionMessage({ state }: { state: PerformanceActionState }) {
  if (!state.message) return null
  return (
    <p className={`performance-form-message ${state.ok ? 'is-success' : 'is-error'}`} role="status">
      {state.ok ? <Check size={13} aria-hidden /> : <CircleAlert size={13} aria-hidden />}
      {state.message}
    </p>
  )
}

function RemoveConnectionButton({ connection }: { connection: PerformanceConnection }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function disconnect() {
    setError(null)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('connectionId', connection.id)
        await disconnectPerformanceConnection(formData)
        setOpen(false)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not remove connection')
      }
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}><Trash2 size={13} /> Remove connection</button>
      <ConfirmDeleteModal
        open={open}
        onClose={() => setOpen(false)}
        title={`Remove ${connection.label || connection.provider}?`}
        description="This removes the encrypted credentials and stops future dashboard syncs for this source. Existing metrics stay in the dashboard."
        confirmLabel="Remove connection"
        pendingLabel="Removing…"
        pending={pending}
        error={error}
        onConfirm={disconnect}
      />
    </>
  )
}

function ProviderConnectionCard({
  accountId,
  provider,
  connection,
  oauthReady,
}: {
  accountId: string
  provider: ProviderDefinition
  connection?: PerformanceConnection
  oauthReady: boolean
}) {
  const [state, action] = useActionState(savePerformanceConnection, initialState)
  const connected = connection?.status === 'connected'
  const hasGuidedOAuth = provider.id === 'shopify' || provider.id === 'meta' || provider.id === 'google'

  return (
    <article className="performance-integration-card" style={{ '--provider-accent': provider.accent } as React.CSSProperties}>
      <header className="performance-integration-head">
        <div className="performance-provider-mark">{provider.shortName.slice(0, 2).toUpperCase()}</div>
        <div className="performance-integration-title">
          <h2>{provider.name}</h2>
          <p>{provider.description}</p>
        </div>
        <span className={`performance-connection-state is-${connection?.status || 'disconnected'}`}>
          {connection?.status || 'disconnected'}
        </span>
      </header>

      {connection ? (
        <div className="performance-connection-summary">
          <div>
            <span>Account</span>
            <strong>{connection.externalAccountId || connection.label || provider.name}</strong>
          </div>
          <div>
            <span>Last sync</span>
            <strong>{formatSyncTime(connection.lastSyncedAt)}</strong>
          </div>
          {connection.lastError ? <p><CircleAlert size={13} /> {connection.lastError}</p> : null}
        </div>
      ) : null}

      {provider.id === 'shopify' ? (
        <form action="/api/performance/shopify/connect" method="get" className="performance-oauth-form">
          <input type="hidden" name="accountId" value={accountId} />
          <div className="performance-oauth-copy">
            <ShieldCheck size={15} aria-hidden />
            <div>
              <strong>Secure Shopify authorization</strong>
              <p>Approve read-only access to orders, customers, products, and analytics reports. The offline token is encrypted for scheduled syncs.</p>
            </div>
          </div>
          <label>
            <span>Permanent store domain</span>
            <input
              name="shop"
              type="text"
              placeholder="store.myshopify.com"
              defaultValue={connection?.externalAccountId || ''}
              autoComplete="url"
              required
            />
          </label>
          <button className="performance-primary-button" type="submit" disabled={!oauthReady}>
            <PlugZap size={14} aria-hidden />
            {connection ? 'Reauthorize Shopify' : 'Authorize in Shopify'}
          </button>
          {!oauthReady ? (
            <p className="performance-oauth-config-note">Add the Shopify app client ID and secret to enable authorization.</p>
          ) : null}
        </form>
      ) : null}

      {provider.id === 'meta' ? (
        <form action="/api/performance/meta/connect" method="get" className="performance-oauth-form">
          <input type="hidden" name="accountId" value={accountId} />
          <div className="performance-oauth-copy">
            <ShieldCheck size={15} aria-hidden />
            <div>
              <strong>Secure Meta authorization</strong>
              <p>Approve ads_read access only. The long-lived reporting token is encrypted for scheduled syncs.</p>
            </div>
          </div>
          <label>
            <span>Ad account ID</span>
            <input
              name="adAccountId"
              type="text"
              inputMode="numeric"
              placeholder="420647623853783"
              defaultValue={connection?.externalAccountId || ''}
              autoComplete="off"
              required
            />
          </label>
          <button className="performance-primary-button" type="submit" disabled={!oauthReady}>
            <PlugZap size={14} aria-hidden />
            {connection ? 'Reauthorize Meta' : 'Authorize with Meta'}
          </button>
          {!oauthReady ? (
            <p className="performance-oauth-config-note">Add the Meta app ID and secret to enable authorization.</p>
          ) : null}
        </form>
      ) : null}

      {provider.id === 'google' ? (
        <form action="/api/performance/google/connect" method="get" className="performance-oauth-form">
          <input type="hidden" name="accountId" value={accountId} />
          <div className="performance-oauth-copy">
            <ShieldCheck size={15} aria-hidden />
            <div>
              <strong>Google Ads OAuth ready</strong>
              <p>Grants read access to reporting data and stores an encrypted offline refresh token for scheduled syncs.</p>
            </div>
          </div>
          <div className="performance-oauth-field-grid">
            <label>
              <span>Customer ID</span>
              <input
                name="customerId"
                type="text"
                inputMode="numeric"
                placeholder="123-456-7890"
                defaultValue={connection?.externalAccountId || ''}
                autoComplete="off"
                required
              />
            </label>
            <label>
              <span>Manager customer ID</span>
              <input
                name="loginCustomerId"
                type="text"
                inputMode="numeric"
                placeholder="Optional MCC ID"
                autoComplete="off"
              />
            </label>
          </div>
          <button className="performance-primary-button" type="submit" disabled={!oauthReady}>
            <PlugZap size={14} aria-hidden />
            {connection ? 'Reauthorize Google Ads' : 'Authorize Google Ads'}
          </button>
          {!oauthReady ? (
            <p className="performance-oauth-config-note">Add the Google Ads OAuth client ID and secret to enable authorization.</p>
          ) : null}
        </form>
      ) : null}

      <details
        className="performance-connect-details"
        open={
          (!hasGuidedOAuth || !oauthReady)
          && (!connection || state.ok === false && Boolean(state.message))
        }
      >
        <summary>
          <Link2 size={14} aria-hidden />
          {hasGuidedOAuth
            ? `Advanced: ${connection ? 'replace' : 'connect with'} provider credentials`
            : connection ? 'Replace credentials' : `Connect ${provider.name}`}
        </summary>
        <form action={action} className="performance-connection-form">
          <input type="hidden" name="accountId" value={accountId} />
          <input type="hidden" name="provider" value={provider.id} />
          <div className="performance-field-grid">
            {provider.fields.map(field => (
              <label key={field.key} className={field.key === 'accessToken' || field.key === 'privateApiKey' || field.key === 'refreshToken' ? 'is-wide' : ''}>
                <span>{field.label}{field.required ? ' *' : ''}</span>
                <input
                  name={field.key}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  required={field.required}
                  autoComplete="off"
                />
                {field.help ? <em>{field.help}</em> : null}
              </label>
            ))}
          </div>
          <div className="performance-form-actions">
            <SubmitButton idle={connected ? 'Verify & replace' : 'Verify & connect'} pending="Checking connection" />
            <span><LockKeyhole size={12} /> AES-256 encrypted</span>
          </div>
          <ActionMessage state={state} />
        </form>
      </details>

      {connection ? (
        <div className="performance-disconnect-form">
          <RemoveConnectionButton connection={connection} />
        </div>
      ) : null}
    </article>
  )
}

export function PerformanceWorkspaceSetup({
  clients,
}: {
  clients: Array<{ id: string; name: string }>
}) {
  const [state, action] = useActionState(createPerformanceAccount, initialState)
  return (
    <section className="performance-workspace-setup">
      <div>
        <span className="performance-eyebrow">First workspace</span>
        <h2>Start a Performance Retainer</h2>
        <p>Sasha Elage will appear here automatically once the database migration is applied if his client account already exists.</p>
      </div>
      <form action={action}>
        <label>
          <span>Client</span>
          <select name="clientId" required defaultValue="">
            <option value="" disabled>Select a client</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <label><span>Currency</span><input name="currency" defaultValue="EUR" maxLength={3} /></label>
        <label><span>Timezone</span><input name="timezone" defaultValue="Europe/Athens" /></label>
        <label><span>Target ROAS</span><input name="targetRoas" type="number" min="0" step="0.1" placeholder="3.0" /></label>
        <label><span>Target CPA</span><input name="targetCpa" type="number" min="0" step="0.01" placeholder="25.00" /></label>
        <SubmitButton idle="Create workspace" pending="Creating workspace" />
        <ActionMessage state={state} />
      </form>
    </section>
  )
}

export function PerformanceIntegrations({
  account,
  connections,
  oauthReadiness,
  pixelSnippet,
}: {
  account: PerformanceAccount
  connections: PerformanceConnection[]
  oauthReadiness: Partial<Record<PerformanceProvider, boolean>>
  pixelSnippet: string
}) {
  const [copied, setCopied] = useState(false)

  async function copyPixel() {
    await navigator.clipboard.writeText(pixelSnippet)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <>
      <div className="performance-integrations-grid">
        {PERFORMANCE_PROVIDER_CATALOG.map(provider => (
          <ProviderConnectionCard
            key={provider.id}
            accountId={account.id}
            provider={provider}
            connection={connections.find(item => item.provider === provider.id)}
            oauthReady={oauthReadiness[provider.id] || false}
          />
        ))}
      </div>
      <section className="performance-pixel-setup">
        <div className="performance-pixel-copy">
          <span className="performance-eyebrow">First-party behavior</span>
          <h2>Activate page views and the full store funnel</h2>
          <p>In Shopify, open <strong>Settings → Customer events → Add custom pixel</strong>. Name it “BTF Performance,” paste this code, require Analytics and Preferences permission, then connect it. Preferences is needed for the browser storage that keeps funnel sessions together. It records consented page and commerce events without direct customer data.</p>
          <ol><li>Add the custom pixel in Shopify.</li><li>Paste the generated code.</li><li>Set customer privacy to Required with Analytics and Preferences, save, and connect.</li><li>Visit the storefront once; the dashboard starts filling in real time.</li></ol>
        </div>
        <div className="performance-pixel-code">
          <div><span>Generated for {account.displayName}</span><button type="button" onClick={copyPixel}><Copy size={13} /> {copied ? 'Copied' : 'Copy pixel'}</button></div>
          <pre><code>{pixelSnippet}</code></pre>
        </div>
      </section>
    </>
  )
}
