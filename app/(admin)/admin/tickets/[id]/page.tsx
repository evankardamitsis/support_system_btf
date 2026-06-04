import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, clients(name)')
    .eq('id', id)
    .single()

  if (!ticket) notFound()

  const { data: comments } = await supabase
    .from('ticket_comments')
    .select('id, body, author_id, is_internal, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  // TODO: fetch active retainer for this client to show in log hours form
  const { data: retainers } = await supabase
    .from('retainers')
    .select('id, period_start, period_end, hours_total, hours_used')
    .eq('client_id', ticket.client_id)
    .order('period_start', { ascending: false })

  async function addComment(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    await supabase.from('ticket_comments').insert({
      ticket_id: id,
      author_id: user.id,
      body: formData.get('body') as string,
      is_internal: formData.get('is_internal') === 'true',
    })
    revalidatePath(`/admin/tickets/${id}`)
  }

  async function updateStatus(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('tickets').update({ status: formData.get('status') as 'open' | 'in_progress' | 'waiting_on_client' | 'resolved' | 'closed' }).eq('id', id)
    revalidatePath(`/admin/tickets/${id}`)
  }

  async function updateAssignee(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('tickets').update({ assigned_to: formData.get('assigned_to') as string || null }).eq('id', id)
    revalidatePath(`/admin/tickets/${id}`)
  }

  async function logHours(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    const minutes = Math.round(parseFloat(formData.get('hours') as string) * 60)
    await supabase.from('hours_log').insert({
      ticket_id: id,
      retainer_id: formData.get('retainer_id') as string,
      agent_id: user.id,
      minutes,
      note: formData.get('note') as string,
    })
    revalidatePath(`/admin/tickets/${id}`)
  }

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_on_client: 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="grid grid-cols-[1fr_280px] gap-6 items-start max-w-5xl">
      {/* Main column */}
      <div className="space-y-6">
        <div>
          <div className="flex items-start gap-3 mb-1">
            <h1 className="text-xl font-semibold flex-1">{ticket.title}</h1>
            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[ticket.status]}`}>
              {ticket.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {(ticket.clients as unknown as { name: string } | null)?.name} · {ticket.type} · {ticket.priority} priority ·
            opened {new Date(ticket.created_at).toLocaleDateString()}
          </p>
        </div>

        {ticket.description && (
          <Card>
            <CardContent className="pt-4 text-sm whitespace-pre-wrap">{ticket.description}</CardContent>
          </Card>
        )}

        <Separator />

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Comments</h2>
          {comments?.map((c) => (
            <Card key={c.id} className={c.is_internal ? 'border-dashed bg-muted/30' : ''}>
              <CardContent className="pt-4 text-sm">
                <p className="text-xs text-muted-foreground mb-1">
                  {c.is_internal && <span className="text-orange-600 font-medium mr-1">[Internal]</span>}
                  {new Date(c.created_at).toLocaleString()}
                </p>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </CardContent>
            </Card>
          ))}
          {(!comments || comments.length === 0) && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
        </div>

        <form action={addComment} className="space-y-2">
          <Textarea name="body" placeholder="Write a reply…" rows={4} required />
          <div className="flex gap-2">
            <Button type="submit" name="is_internal" value="false" size="sm">Reply</Button>
            <Button type="submit" name="is_internal" value="true" size="sm" variant="outline">
              Internal note
            </Button>
          </div>
        </form>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Update status</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateStatus} className="flex gap-2">
              <select name="status" defaultValue={ticket.status}
                className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="waiting_on_client">Waiting on client</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <Button type="submit" size="sm" variant="secondary">Save</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Log hours</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={logHours} className="space-y-2">
              <select name="retainer_id" required
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                <option value="">Select retainer…</option>
                {retainers?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                    {' '}({Number(r.hours_used).toFixed(1)}/{Number(r.hours_total).toFixed(1)} h)
                  </option>
                ))}
              </select>
              <Input name="hours" type="number" step="0.25" min="0.25" placeholder="Hours (e.g. 1.5)" required />
              <Input name="note" placeholder="Note (optional)" />
              <Button type="submit" size="sm" className="w-full">Log</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
