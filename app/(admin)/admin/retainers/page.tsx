import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default async function AdminRetainersPage() {
  const supabase = await createClient()

  // TODO: add period filter
  const { data: retainers } = await supabase
    .from('retainers')
    .select('*, clients(name)')
    .order('period_start', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Retainers</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Total h</TableHead>
            <TableHead>Used h</TableHead>
            <TableHead>Remaining h</TableHead>
            <TableHead>Usage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {retainers?.map((r) => {
            const used = Number(r.hours_used)
            const total = Number(r.hours_total)
            const remaining = total - used
            const pct = Math.min(100, (used / total) * 100)
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/admin/clients/${r.client_id}`} className="hover:underline font-medium">
                    {(r.clients as unknown as { name: string } | null)?.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm">{total.toFixed(1)}</TableCell>
                <TableCell className="text-sm">{used.toFixed(1)}</TableCell>
                <TableCell className={`text-sm font-medium ${remaining < 2 ? 'text-destructive' : ''}`}>
                  {remaining.toFixed(1)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct > 85 ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
          {(!retainers || retainers.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No retainers yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
