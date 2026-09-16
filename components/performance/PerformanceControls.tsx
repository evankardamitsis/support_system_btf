'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { DatabaseZap, RefreshCw } from 'lucide-react'
import {
  syncPerformanceAccountAction,
  type PerformanceActionState,
} from '@/app/actions/performance'

const initialState: PerformanceActionState = { ok: false, message: '' }

function SyncSubmit({ sources }: { sources: string[] }) {
  const { pending } = useFormStatus()
  return (
    <>
      <button type="submit" className="performance-sync-button" disabled={pending}>
        <RefreshCw size={14} className={pending ? 'is-spinning' : ''} aria-hidden />
        {pending ? 'Syncing' : 'Sync now'}
      </button>
      {pending ? (
        <div className="performance-sync-screen" role="status" aria-live="polite" aria-busy="true">
          <div className="performance-sync-screen-grid" aria-hidden />
          <section className="performance-sync-dialog">
            <div className="performance-sync-orbit" aria-hidden>
              <span /><span /><DatabaseZap size={22} />
            </div>
            <span className="performance-eyebrow">Live data refresh</span>
            <h2>Syncing Performance HQ</h2>
            <p>Fetching the latest provider reports, reconciling store truth, and rebuilding the dashboard. This screen will close when the data is ready.</p>
            <div className="performance-sync-progress" aria-hidden><span /></div>
            <div className="performance-sync-sources">
              {(sources.length ? sources : ['Connected sources']).map((source, index) => (
                <span key={source} style={{ '--sync-delay': `${index * 130}ms` } as React.CSSProperties}>
                  <i aria-hidden />{source}
                </span>
              ))}
            </div>
            <small>Keep this page open · provider response times can vary</small>
          </section>
        </div>
      ) : null}
    </>
  )
}

export function PerformanceSyncControl({ accountId, sources = [] }: { accountId: string; sources?: string[] }) {
  const [state, action] = useActionState(syncPerformanceAccountAction, initialState)
  return (
    <div className="performance-sync-control">
      <form action={action}>
        <input type="hidden" name="accountId" value={accountId} />
        <SyncSubmit sources={sources} />
      </form>
      {state.message ? (
        <p className={`performance-action-message ${state.ok ? 'is-success' : 'is-error'}`} role="status">
          {state.message}
        </p>
      ) : null}
    </div>
  )
}

export function PerformanceAccountPicker({
  accounts,
  value,
}: {
  accounts: Array<{ id: string; displayName: string }>
  value: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(nextAccount: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('account', nextAccount)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="performance-account-picker">
      <span>Workspace</span>
      <select value={value} onChange={event => handleChange(event.target.value)}>
        {accounts.map(account => (
          <option key={account.id} value={account.id}>
            {account.displayName}
          </option>
        ))}
      </select>
    </label>
  )
}
