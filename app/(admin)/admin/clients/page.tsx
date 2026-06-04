import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default async function AdminClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, contact_name, plan_name, renewal_date, sla_response_hours')
    .order('name')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>
        <Link href="/admin/clients/new">
          <Button size="sm">New client</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Renewal</TableHead>
            <TableHead>SLA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients?.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link href={`/admin/clients/${c.id}`} className="hover:underline font-medium">
                  {c.name}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.contact_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
              <TableCell className="text-sm">{c.plan_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {c.renewal_date ? new Date(c.renewal_date).toLocaleDateString() : '—'}
              </TableCell>
              <TableCell className="text-sm">{c.sla_response_hours}h</TableCell>
            </TableRow>
          ))}
          {(!clients || clients.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No clients yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
