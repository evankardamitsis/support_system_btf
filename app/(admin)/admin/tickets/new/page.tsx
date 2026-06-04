import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export default async function AdminNewTicketPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name')

  async function createTicket(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: ticket, error } = await supabase
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

    if (error || !ticket) redirect('/admin/tickets')
    redirect(`/admin/tickets/${ticket.id}`)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-4">New Ticket</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={createTicket} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="client_id">Client</Label>
              <select name="client_id" required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Select client…</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <select name="type" defaultValue="task"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                  <option value="request">Request</option>
                  <option value="question">Question</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <select name="priority" defaultValue="normal"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={5} />
            </div>
            <Button type="submit">Create ticket</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
