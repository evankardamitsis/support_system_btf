import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, ArrowRight } from 'lucide-react'

export default async function AdminClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, contact_name, plan_name, renewal_date, sla_response_hours')
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients?.length ?? 0} {clients?.length === 1 ? 'client' : 'clients'}</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          New client
        </Link>
      </div>

      {clients && clients.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/admin/clients/${c.id}`}
              className="group bg-white border border-gray-200 rounded-lg px-6 py-5 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {c.name}
                    </p>
                    <p className="text-sm text-gray-400 truncate mt-0.5">
                      {c.contact_name && <>{c.contact_name} · </>}{c.email}
                    </p>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-8 shrink-0 ml-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Plan</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{c.plan_name ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">SLA</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{c.sla_response_hours}h</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Renewal</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      {c.renewal_date ? new Date(c.renewal_date).toLocaleDateString('en-GB') : '—'}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg py-20 text-center">
          <p className="text-sm font-medium text-gray-900">No clients yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first client to get started</p>
          <Link
            href="/admin/clients/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={15} />
            Add client
          </Link>
        </div>
      )}
    </div>
  )
}
