import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function RetainerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  // TODO: allow selecting past periods
  const { data: retainer } = await supabase
    .from('retainers')
    .select('*')
    .eq('client_id', profile!.client_id!)
    .order('period_start', { ascending: false })
    .limit(1)
    .single()

  const hoursRemaining = retainer
    ? Number(retainer.hours_total) - Number(retainer.hours_used)
    : 0
  const usagePct = retainer
    ? Math.min(100, (Number(retainer.hours_used) / Number(retainer.hours_total)) * 100)
    : 0

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Retainer</h1>

      {retainer ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {new Date(retainer.period_start).toLocaleDateString()} –{' '}
              {new Date(retainer.period_end).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hours used</span>
              <span className="font-medium">{Number(retainer.hours_used).toFixed(1)} h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hours remaining</span>
              <span className="font-medium">{hoursRemaining.toFixed(1)} h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{Number(retainer.hours_total).toFixed(1)} h</span>
            </div>

            {/* Hours gauge */}
            <div className="mt-2">
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usagePct > 85 ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{usagePct.toFixed(0)}% used</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">No active retainer period found.</p>
      )}
    </div>
  )
}
