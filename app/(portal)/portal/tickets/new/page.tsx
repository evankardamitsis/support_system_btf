import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export default function NewTicketPage() {
  async function createTicket(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: profile } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single()

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        client_id: profile!.client_id!,
        created_by: user.id,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        type: formData.get('type') as 'bug' | 'task' | 'request' | 'question',
      })
      .select('id')
      .single()

    if (error || !ticket) redirect('/portal/tickets')
    redirect(`/portal/tickets/${ticket.id}`)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-4">New Ticket</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={createTicket} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="type">Type</Label>
              <select
                name="type"
                defaultValue="task"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="request">Request</option>
                <option value="question">Question</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={5} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Submit ticket</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
