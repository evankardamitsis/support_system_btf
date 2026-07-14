'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { renewClientRetainerNow } from '@/app/actions/retainers'
import { notifyError, notifyLoading, dismissToast } from '@/lib/notify'
import { toast } from 'sonner'

export function RetainerRenewBanner({
  clientId,
  periodEnd,
  canManage,
}: {
  clientId: string
  periodEnd: string
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)

  if (periodEnd >= today) return null

  const ended = new Date(`${periodEnd}T12:00:00`)
  const now = new Date(`${today}T12:00:00`)
  const daysAgo = Math.max(
    1,
    Math.round((now.getTime() - ended.getTime()) / 86400000)
  )

  function handleRenew() {
    startTransition(async () => {
      const toastId = notifyLoading('Starting new period…')
      try {
        const result = await renewClientRetainerNow(clientId)
        if (result.renewed) {
          toast.success(`New period: ${result.periodStart} – ${result.periodEnd}`, { id: toastId })
          router.refresh()
          return
        }
        toast.message(result.reason, { id: toastId })
      } catch (err) {
        dismissToast(toastId)
        notifyError(err instanceof Error ? err.message : 'Renewal failed')
      }
    })
  }

  return (
    <div className="retainer-renew-banner" role="status">
      <div className="retainer-renew-banner-copy">
        <p className="retainer-renew-banner-title">Period ended {daysAgo} day{daysAgo === 1 ? '' : 's'} ago</p>
        <p className="retainer-renew-banner-hint">
          Auto-renew runs daily at 06:00 UTC. If it was missed, start the next billing period now.
        </p>
      </div>
      {canManage ? (
        <button
          type="button"
          className="dash-btn-primary btn-primary"
          disabled={pending}
          onClick={handleRenew}
        >
          {pending ? 'Renewing…' : 'Renew now'}
        </button>
      ) : null}
    </div>
  )
}
