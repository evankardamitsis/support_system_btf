import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_on_client: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
}

const priorityColors: Record<string, string> = {
  low: 'text-muted-foreground',
  normal: '',
  high: 'text-orange-600 font-medium',
  critical: 'text-destructive font-semibold',
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; client?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  // TODO: add server-side pagination
  let query = supabase
    .from('tickets')
    .select('id, title, status, priority, type, created_at, clients(name)')
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status as 'open' | 'in_progress' | 'waiting_on_client' | 'resolved' | 'closed')
  if (filters.priority) query = query.eq('priority', filters.priority as 'low' | 'normal' | 'high' | 'critical')
  if (filters.client) query = query.eq('client_id', filters.client)

  const { data: tickets } = await query

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">All Tickets</h1>
        <Link href="/admin/tickets/new">
          <Button size="sm">New ticket</Button>
        </Link>
      </div>

      {/* Filter controls */}
      <form className="flex gap-2 text-sm flex-wrap">
        <select name="status" defaultValue={filters.status ?? ''}
          className="rounded-md border px-2 py-1 text-sm bg-background">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="waiting_on_client">Waiting on client</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select name="priority" defaultValue={filters.priority ?? ''}
          className="rounded-md border px-2 py-1 text-sm bg-background">
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">Filter</Button>
        <Link href="/admin/tickets">
          <Button variant="ghost" size="sm">Clear</Button>
        </Link>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets?.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <Link href={`/admin/tickets/${t.id}`} className="hover:underline font-medium">
                  {t.title}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {(t.clients as unknown as { name: string } | null)?.name}
              </TableCell>
              <TableCell className="capitalize text-sm">{t.type}</TableCell>
              <TableCell className={`capitalize text-sm ${priorityColors[t.priority]}`}>
                {t.priority}
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[t.status]}`}>
                  {t.status.replace(/_/g, ' ')}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(t.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
          {(!tickets || tickets.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No tickets found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
