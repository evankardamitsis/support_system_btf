'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ticket, BarChart2, X } from 'lucide-react'

const nav = [
  { label: 'My Tickets', href: '/portal/tickets',  icon: Ticket },
  { label: 'Retainer',   href: '/portal/retainer', icon: BarChart2 },
]

function initials(name?: string, email?: string) {
  if (name) { const p = name.trim().split(' '); return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() }
  return email?.[0]?.toUpperCase() ?? '?'
}

export function PortalSidebar({ userName, userEmail, onClose }: {
  userName?: string; userEmail?: string; onClose?: () => void
}) {
  const pathname = usePathname()
  const ini = initials(userName, userEmail)

  return (
    <aside className="flex flex-col h-full" style={{ width: 224, background: '#1e1e26', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {onClose && (
        <button onClick={onClose} className="lg:hidden absolute top-3 right-3 p-1 text-white/30 hover:text-white/60 transition-colors">
          <X size={16} />
        </button>
      )}

      <nav className="flex-1 px-2 pt-2 pb-2 overflow-y-auto">
        <div className="px-3 pt-2 pb-1.5 mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-dm-mono)' }}>
            My Portal
          </p>
        </div>
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-all duration-100"
              style={{ background: active ? 'rgba(232,255,71,0.12)' : 'transparent', color: active ? '#e8ff47' : 'rgba(255,255,255,0.55)' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Icon size={16} style={{ color: active ? '#e8ff47' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <span className="text-sm" style={{ fontWeight: active ? 600 : 400, color: active ? '#e8ff47' : 'rgba(255,255,255,0.65)' }}>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 mx-2 mb-2 rounded-xl flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: '#e8ff47', color: '#0f0f0f' }}>{ini}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate leading-none" style={{ color: 'rgba(255,255,255,0.85)' }}>{userName ?? userEmail}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Client</p>
        </div>
      </div>
    </aside>
  )
}
