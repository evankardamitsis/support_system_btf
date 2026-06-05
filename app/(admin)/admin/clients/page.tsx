import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { DashButton } from '@/components/dashboard/DashButton'
import { MetricStrip } from '@/components/dashboard/MetricStrip'
import { ClientsList } from '@/components/clients/ClientsList'
import { Plus } from 'lucide-react'

export default async function AdminClientsPage() {
  const supabase = await createClient()
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, email, contact_name, plan_name, renewal_date, sla_response_hours')
    .order('name')

  const list = clients ?? []

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Clients" description="Could not load client accounts." />
        <div className="entity-panel dash-empty">
          <p className="dash-empty-title">Failed to load clients</p>
          <p className="dash-empty-hint">{error.message}</p>
        </div>
      </div>
    )
  }
  const withPlan = list.filter(c => c.plan_name).length
  const renewingSoon = list.filter(c => {
    if (!c.renewal_date) return false
    const days = (new Date(c.renewal_date).getTime() - Date.now()) / 86400000
    return days >= 0 && days <= 30
  }).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        description="Accounts, plans, and portal access — open any row for retainer and tickets."
        action={
          <DashButton href="/admin/clients/new">
            <Plus size={14} />
            New client
          </DashButton>
        }
      />

      <MetricStrip
        foldLabel="Clients"
        items={[
          { label: 'Total accounts', value: String(list.length) },
          { label: 'Care / Grow', value: String(withPlan), hint: 'Package set' },
          {
            label: 'Renewing soon',
            value: String(renewingSoon),
            hint: 'Next 30 days',
            accent: renewingSoon > 0 ? '#fb923c' : undefined,
            emphasis: renewingSoon > 0,
          },
        ]}
      />

      <ClientsList clients={list} />
    </div>
  )
}
