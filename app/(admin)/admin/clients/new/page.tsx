import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { DashCancel } from '@/components/dashboard/DashCancel'

export default function AdminNewClientPage() {
  const today = new Date().toISOString().split('T')[0]
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  async function createClientAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: client } = await supabase
      .from('clients')
      .insert({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        contact_name: (formData.get('contact_name') as string) || null,
        plan_name: (formData.get('plan_name') as string) || null,
        sla_response_hours: parseInt(formData.get('sla_response_hours') as string, 10) || 8,
      })
      .select('id')
      .single()
    if (!client) redirect('/admin/clients')
    const hoursTotal = parseFloat(formData.get('hours_total') as string)
    const periodStart = formData.get('period_start') as string
    const periodEnd = formData.get('period_end') as string
    if (hoursTotal && periodStart && periodEnd) {
      await supabase.from('retainers').insert({
        client_id: client.id,
        period_start: periodStart,
        period_end: periodEnd,
        hours_total: hoursTotal,
      })
    }
    redirect(`/admin/clients/${client.id}`)
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Link href="/admin/clients" className="dash-back">
        ← Back to clients
      </Link>

      <PageHeader
        title="New client"
        description="Add a new client and set up their first retainer period."
      />

      <form action={createClientAction} className="space-y-5">
        <FormPanel title="Client details">
          <div className="flex flex-col gap-4">
            <div>
              <label className="dash-label">
                Company name <span className="dash-label-required">*</span>
              </label>
              <input name="name" required className="btf-input w-full" placeholder="Acropolis Studios" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="dash-label">Contact name</label>
                <input name="contact_name" className="btf-input w-full" placeholder="Nikos Papadopoulos" />
              </div>
              <div>
                <label className="dash-label">
                  Email <span className="dash-label-required">*</span>
                </label>
                <input name="email" type="email" required className="btf-input w-full" placeholder="hello@studio.gr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="dash-label">Plan</label>
                <input name="plan_name" className="btf-input w-full" placeholder="e.g. Standard" />
              </div>
              <div>
                <label className="dash-label">SLA response (hours)</label>
                <input name="sla_response_hours" type="number" defaultValue="8" min="1" className="btf-input w-full" />
              </div>
            </div>
          </div>
        </FormPanel>

        <FormPanel title="First retainer period">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="dash-label">Start date</label>
                <input name="period_start" type="date" defaultValue={today} className="btf-input w-full" />
              </div>
              <div>
                <label className="dash-label">End date</label>
                <input name="period_end" type="date" defaultValue={nextMonth} className="btf-input w-full" />
              </div>
            </div>
            <div>
              <label className="dash-label">Total hours</label>
              <input name="hours_total" type="number" step="0.5" min="1" placeholder="e.g. 20" className="btf-input w-full" />
            </div>
          </div>
        </FormPanel>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="dash-btn-primary btn-primary cursor-pointer">
            Create client
          </button>
          <DashCancel href="/admin/clients" />
        </div>
      </form>
    </div>
  )
}
