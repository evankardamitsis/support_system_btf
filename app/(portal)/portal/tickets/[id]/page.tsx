import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_on_client: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
}

export default async function PortalTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, clients(name)')
    .eq('id', id)
    .single()

  if (!ticket) notFound()

  // TODO: fetch assignee name from users table
  const { data: comments } = await supabase
    .from('ticket_comments')
    .select('id, body, author_id, is_internal, created_at')
    .eq('ticket_id', id)
    .eq('is_internal', false)
    .order('created_at', { ascending: true })

  async function addComment(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    await supabase.from('ticket_comments').insert({
      ticket_id: id,
      author_id: user.id,
      body: formData.get('body') as string,
      is_internal: false,
    })
    redirect(`/portal/tickets/${id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-xl font-semibold">{ticket.title}</h1>
          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[ticket.status]}`}>
            {ticket.status.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {ticket.type} · {ticket.priority} priority · opened {new Date(ticket.created_at).toLocaleDateString()}
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
          <Card key={c.id}>
            <CardContent className="pt-4 text-sm">
              <p className="text-xs text-muted-foreground mb-1">
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
        <Button type="submit" size="sm">Send reply</Button>
      </form>
    </div>
  )
}
