import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RetainerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users').select('client_id').eq('id', user.id).single()

  const { data: retainer } = await supabase
    .from('retainers').select('*')
    .eq('client_id', profile!.client_id!)
    .order('period_start', { ascending: false })
    .limit(1).single()

  const hoursUsed  = retainer ? Number(retainer.hours_used)  : 0
  const hoursTotal = retainer ? Number(retainer.hours_total) : 0
  const hoursLeft  = hoursTotal - hoursUsed
  const pct        = hoursTotal > 0 ? Math.min(100, (hoursUsed / hoursTotal) * 100) : 0
  const isOver     = hoursLeft < 0
  const isDanger   = pct > 85

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Retainer</h1>
        {retainer && (
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(retainer.period_start).toLocaleDateString('en-GB')} - {new Date(retainer.period_end).toLocaleDateString('en-GB')}
          </p>
        )}
      </div>

      {retainer ? (
        <div className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Used</p>
              <p className="text-3xl font-semibold text-gray-900 tabular-nums">{hoursUsed.toFixed(1)}</p>
              <p className="text-sm text-gray-400 mt-0.5">hours</p>
            </div>
            <div className={`bg-white border rounded-lg p-5 text-center ${isDanger ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Remaining</p>
              <p className={`text-3xl font-semibold tabular-nums ${isOver ? 'text-red-600' : isDanger ? 'text-orange-600' : 'text-green-600'}`}>
                {isOver ? '-' : ''}{Math.abs(hoursLeft).toFixed(1)}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">hours</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total</p>
              <p className="text-3xl font-semibold text-gray-900 tabular-nums">{hoursTotal.toFixed(0)}</p>
              <p className="text-sm text-gray-400 mt-0.5">hours</p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Hours consumed</span>
              <span className={`font-semibold ${isDanger ? 'text-red-600' : 'text-gray-900'}`}>{pct.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-red-500' : isDanger ? 'bg-orange-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            {isDanger && (
              <p className="text-sm text-orange-600">
                {isOver
                  ? `You have exceeded your retainer by ${Math.abs(hoursLeft).toFixed(1)} hours. Please contact BTF.`
                  : `You have used ${pct.toFixed(0)}% of your retainer. ${hoursLeft.toFixed(1)} hours remaining.`
                }
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg py-20 text-center">
          <p className="text-sm font-medium text-gray-900">No active retainer</p>
          <p className="text-sm text-gray-400 mt-1">Contact your BTF account manager</p>
        </div>
      )}
    </div>
  )
}
