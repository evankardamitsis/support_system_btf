'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import {
  syncPerformanceAccountAction,
  type PerformanceActionState,
} from '@/app/actions/performance'

const initialState: PerformanceActionState = { ok: false, message: '' }

function SyncSubmit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="performance-sync-button" disabled={pending}>
      <RefreshCw size={14} className={pending ? 'is-spinning' : ''} aria-hidden />
      {pending ? 'Syncing' : 'Sync now'}
    </button>
  )
}

export function PerformanceSyncControl({ accountId }: { accountId: string }) {
  const [state, action] = useActionState(syncPerformanceAccountAction, initialState)
  return (
    <div className="performance-sync-control">
      <form action={action}>
        <input type="hidden" name="accountId" value={accountId} />
        <SyncSubmit />
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

