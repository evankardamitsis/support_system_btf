import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function AdminNewClientPage() {
  async function createClientAction(formData: FormData) {
    'use server'
    const supabase = await createClient()

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        contact_name: formData.get('contact_name') as string,
        plan_name: formData.get('plan_name') as string,
        sla_response_hours: parseInt(formData.get('sla_response_hours') as string, 10) || 8,
      })
      .select('id')
      .single()

    if (clientError || !client) redirect('/admin/clients')

    // Create first retainer period
    const hoursTotal = parseFloat(formData.get('hours_total') as string)
    const periodStart = formData.get('period_start') as string
    const periodEnd = formData.get('period_end') as string

    if (hoursTotal && periodStart && periodEnd) {
      await supabase.from('retainers').insert({
        client_id: client.id,
        period_start: periodStart,
        period_end: periodEnd,
        hours_total: hoursTotal,
      })
    }

    redirect(`/admin/clients/${client.id}`)
  }

  const today = new Date().toISOString().split('T')[0]
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-4">New Client</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={createClientAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label htmlFor="name">Company name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_name">Contact name</Label>
                <Input id="contact_name" name="contact_name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan_name">Plan name</Label>
                <Input id="plan_name" name="plan_name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sla_response_hours">SLA response hours</Label>
                <Input id="sla_response_hours" name="sla_response_hours" type="number" defaultValue="8" min="1" />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">First retainer period</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="period_start">Start date</Label>
                  <Input id="period_start" name="period_start" type="date" defaultValue={today} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="period_end">End date</Label>
                  <Input id="period_end" name="period_end" type="date" defaultValue={nextMonth} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="hours_total">Total hours</Label>
                  <Input id="hours_total" name="hours_total" type="number" step="0.5" min="1" placeholder="e.g. 20" />
                </div>
              </div>
            </div>

            <Button type="submit">Create client</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
