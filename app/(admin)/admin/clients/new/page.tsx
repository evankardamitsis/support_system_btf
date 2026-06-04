import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'

export default function AdminNewClientPage() {
  const today     = new Date().toISOString().split('T')[0]
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  async function createClientAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: client } = await supabase.from('clients').insert({
      name:               formData.get('name') as string,
      email:              formData.get('email') as string,
      contact_name:       (formData.get('contact_name') as string) || null,
      plan_name:          (formData.get('plan_name') as string) || null,
      sla_response_hours: parseInt(formData.get('sla_response_hours') as string, 10) || 8,
    }).select('id').single()
    if (!client) redirect('/admin/clients')
    const hoursTotal  = parseFloat(formData.get('hours_total') as string)
    const periodStart = formData.get('period_start') as string
    const periodEnd   = formData.get('period_end') as string
    if (hoursTotal && periodStart && periodEnd) {
      await supabase.from('retainers').insert({ client_id: client.id, period_start: periodStart, period_end: periodEnd, hours_total: hoursTotal })
    }
    redirect(`/admin/clients/${client.id}`)
  }

  const inputClass = "w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-300 transition-all"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4">
          <ArrowLeft size={15} />Back to clients
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
        <p className="text-sm text-gray-400 mt-1">Add a new client and set up their first retainer period.</p>
      </div>

      <form action={createClientAction} className="space-y-5">
        {/* Client details */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e9e9e7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #f0f0ee', background: '#fafaf9' }}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className={labelClass}>Company name <span className="text-red-400">*</span></label>
              <input name="name" required className={inputClass} placeholder="Acropolis Studios" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Contact name</label>
                <input name="contact_name" className={inputClass} placeholder="Nikos Papadopoulos" />
              </div>
              <div>
                <label className={labelClass}>Email <span className="text-red-400">*</span></label>
                <input name="email" type="email" required className={inputClass} placeholder="hello@studio.gr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Plan</label>
                <input name="plan_name" className={inputClass} placeholder="e.g. Standard" />
              </div>
              <div>
                <label className={labelClass}>SLA response (hours)</label>
                <input name="sla_response_hours" type="number" defaultValue="8" min="1" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* Retainer */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e9e9e7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #f0f0ee', background: '#fafaf9' }}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Retainer Period</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Start date</label>
                <input name="period_start" type="date" defaultValue={today} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End date</label>
                <input name="period_end" type="date" defaultValue={nextMonth} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Total hours</label>
              <input name="hours_total" type="number" step="0.5" min="1" placeholder="e.g. 20" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            style={{ background: '#0f0f0f' }}
          >
            Create client
          </button>
          <Link
            href="/admin/clients"
            className="px-5 py-2.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
