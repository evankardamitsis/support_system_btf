import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

async function logout() {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client') redirect('/admin/tickets')

  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r flex flex-col gap-1 p-4 shrink-0">
        <div className="px-2 py-3 mb-2">
          <span className="font-semibold text-sm tracking-tight">Below The Fold</span>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{profile?.full_name}</p>
        </div>
        <Separator className="mb-2" />
        <Link href="/portal/tickets">
          <Button variant="ghost" className="w-full justify-start">My Tickets</Button>
        </Link>
        <Link href="/portal/retainer">
          <Button variant="ghost" className="w-full justify-start">Retainer</Button>
        </Link>
        <div className="flex-1" />
        <Separator className="my-2" />
        <form action={logout}>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" type="submit">
            Log out
          </Button>
        </form>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
