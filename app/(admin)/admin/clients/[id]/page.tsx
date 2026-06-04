import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const [{ data: retainers }, { data: tickets }] = await Promise.all([
    supabase
      .from('retainers')
      .select('*')
      .eq('client_id', id)
      .order('period_start', { ascending: false }),
    supabase
      .from('tickets')
      .select('id, title, status, priority, created_at')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const activeRetainer = retainers?.[0]
  const usagePct = activeRetainer
    ? Math.min(100, (Number(activeRetainer.hours_used) / Number(activeRetainer.hours_total)) * 100)
    : 0

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {client.contact_name} · {client.email} · {client.plan_name}
          </p>
        </div>
        <Link href={`/admin/tickets/new?client=${id}`}>
          <Button size="sm">New ticket</Button>
        </Link>
      </div>

      {/* Retainer gauge */}
      {activeRetainer && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Active retainer: {new Date(activeRetainer.period_start).toLocaleDateString()} – {new Date(activeRetainer.period_end).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {Number(activeRetainer.hours_used).toFixed(1)} h used
              </span>
              <span className="text-muted-foreground">
                {(Number(activeRetainer.hours_total) - Number(activeRetainer.hours_used)).toFixed(1)} h remaining of {Number(activeRetainer.hours_total).toFixed(1)} h
              </span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${usagePct > 85 ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket history */}
      <div>
        <h2 className="text-base font-medium mb-3">Ticket history</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
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
                <TableCell className="capitalize text-sm">{t.priority}</TableCell>
                <TableCell className="capitalize text-sm">{t.status.replace(/_/g, ' ')}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {(!tickets || tickets.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No tickets.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
