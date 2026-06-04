import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'

export default async function AdminNewTicketPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id, name').order('name')

  async function createTicket(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    const { data: ticket } = await supabase.from('tickets').insert({
      client_id:   formData.get('client_id') as string,
      created_by:  user.id,
      title:       formData.get('title') as string,
      description: formData.get('description') as string,
      type:        formData.get('type') as 'bug' | 'task' | 'request' | 'question',
      priority:    formData.get('priority') as 'low' | 'normal' | 'high' | 'critical',
    }).select('id').single()
    if (ticket) redirect(`/admin/tickets/${ticket.id}`)
    redirect('/admin/tickets')
  }

  const inputClass  = "w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-300 transition-all"
  const selectClass = "w-full px-3.5 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all cursor-pointer"
  const labelClass  = "block text-sm font-medium text-gray-700 mb-1.5"

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/admin/tickets" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4">
          <ArrowLeft size={15} />Back to tickets
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Ticket</h1>
        <p className="text-sm text-gray-400 mt-1">Create a ticket on behalf of a client.</p>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #e9e9e7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #f0f0ee', background: '#fafaf9' }}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket Details</h2>
        </div>
        <form action={createTicket} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Client <span className="text-red-400">*</span></label>
            <select name="client_id" required className={selectClass}>
              <option value="">Select client…</option>
              {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Subject <span className="text-red-400">*</span></label>
            <input name="title" required className={inputClass} placeholder="Brief description of the issue" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Type</label>
              <select name="type" defaultValue="task" className={selectClass}>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="request">Request</option>
                <option value="question">Question</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select name="priority" defaultValue="normal" className={selectClass}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              name="description"
              rows={5}
              className={`${inputClass} resize-y`}
              style={{ minHeight: 100 }}
              placeholder="Provide as much detail as possible…"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              style={{ background: '#0f0f0f' }}
            >
              Create ticket
            </button>
            <Link href="/admin/tickets" className="px-5 py-2.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
