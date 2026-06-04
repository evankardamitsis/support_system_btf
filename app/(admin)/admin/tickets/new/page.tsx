import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FormPanel } from '@/components/dashboard/FormPanel'
import { DashCancel } from '@/components/dashboard/DashCancel'
import Link from 'next/link'

export default async function AdminNewTicketPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id, name').order('name')

  async function createTicket(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    const { data: ticket } = await supabase
      .from('tickets')
      .insert({
        client_id: formData.get('client_id') as string,
        created_by: user.id,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        type: formData.get('type') as 'bug' | 'task' | 'request' | 'question',
        priority: formData.get('priority') as 'low' | 'normal' | 'high' | 'critical',
      })
      .select('id')
      .single()
    if (ticket) redirect(`/admin/tickets/${ticket.id}`)
    redirect('/admin/tickets')
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Link href="/admin/tickets" className="dash-back">
        ← Back to tickets
      </Link>

      <PageHeader
        title="New ticket"
        description="Create a ticket on behalf of a client."
      />

      <FormPanel title="Ticket details">
        <form action={createTicket} className="flex flex-col gap-4">
          <div>
            <label className="dash-label">
              Client <span className="dash-label-required">*</span>
            </label>
            <select name="client_id" required className="dash-select w-full text-sm">
              <option value="">Select client…</option>
              {clients?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="dash-label">
              Subject <span className="dash-label-required">*</span>
            </label>
            <input
              name="title"
              required
              className="btf-input w-full"
              placeholder="Brief description of the issue"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="dash-label">Type</label>
              <select name="type" defaultValue="task" className="dash-select w-full text-sm">
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="request">Request</option>
                <option value="question">Question</option>
              </select>
            </div>
            <div>
              <label className="dash-label">Priority</label>
              <select name="priority" defaultValue="normal" className="dash-select w-full text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="dash-label">Description</label>
            <textarea
              name="description"
              rows={5}
              className="btf-input w-full resize-y"
              style={{ minHeight: 100 }}
              placeholder="Provide as much detail as possible…"
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="submit" className="dash-btn-primary btn-primary cursor-pointer">
              Create ticket
            </button>
            <DashCancel href="/admin/tickets" />
          </div>
        </form>
      </FormPanel>
    </div>
  )
}
