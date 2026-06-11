import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { AdminNewRetainerForm } from '@/components/retainers/AdminNewRetainerForm'
import type { RetainerLifecycleStatus } from '@/lib/retainers/status'

export default async function AdminNewRetainerPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) redirect('/admin/tickets')

  const { client: defaultClientId } = await searchParams
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, billing_cycle_day, retainer_status')
    .order('name')

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Link href="/admin/retainers" className="dash-back">
        ← Back to retainers
      </Link>

      <PageHeader
        title="New retainer"
        description="Set up Care, Grow, or Fixed hours and billing for a client period."
      />

      <AdminNewRetainerForm
        clients={(clients ?? []).map(client => ({
          id: client.id,
          name: client.name,
          billing_cycle_day: client.billing_cycle_day,
          retainer_status: (client.retainer_status ?? 'active') as RetainerLifecycleStatus,
        }))}
        defaultClientId={defaultClientId}
      />
    </div>
  )
}
