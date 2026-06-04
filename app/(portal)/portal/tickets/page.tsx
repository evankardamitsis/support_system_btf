import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

export default async function PortalTicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user!.id)
    .single()

  // TODO: add pagination
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, title, status, priority, type, created_at')
    .eq('client_id', profile!.client_id!)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Tickets</h1>
        <Link href="/portal/tickets/new">
          <Button size="sm">New ticket</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
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
                <Link href={`/portal/tickets/${t.id}`} className="hover:underline font-medium">
                  {t.title}
                </Link>
              </TableCell>
              <TableCell className="capitalize">{t.type}</TableCell>
              <TableCell className="capitalize">{t.priority}</TableCell>
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
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No tickets yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
