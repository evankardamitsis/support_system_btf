import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const params = await searchParams
  const token = params.token

  if (!token) notFound()

  const supabase = await createClient()

  // Validate token
  const { data: invite } = await supabase
    .from('invite_tokens')
    .select('id, client_id, used, expires_at')
    .eq('token', token)
    .single()

  if (!invite || invite.used || new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              This invite link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function register(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const fullName = formData.get('full_name') as string
    const password = formData.get('password') as string

    // Re-validate token server-side
    const { data: inv } = await supabase
      .from('invite_tokens')
      .select('id, client_id, used, expires_at')
      .eq('token', token as string)
      .single()

    if (!inv || inv.used || new Date(inv.expires_at) < new Date()) {
      redirect(`/auth/register?token=${token}&error=Token+invalid+or+expired`)
    }

    // We need service role to create a user and bypass email confirmation.
    // For now use signUp; the user will receive a confirmation email from Supabase.
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: '', // email comes from invite context — fetch from clients table
      password,
      options: { data: { full_name: fullName } },
    })

    // Fetch client email to use as signup email
    const { data: client } = await supabase
      .from('clients')
      .select('email')
      .eq('id', inv.client_id)
      .single()

    if (!client) {
      redirect(`/auth/register?token=${token}&error=Client+not+found`)
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: client.email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (authError || !authData.user) {
      redirect(
        `/auth/register?token=${token}&error=${encodeURIComponent(authError?.message ?? 'Signup failed')}`
      )
    }

    // Insert public.users row
    await supabase.from('users').insert({
      id: authData.user.id,
      role: 'client',
      client_id: inv.client_id,
      full_name: fullName,
    })

    // Mark token used
    await supabase
      .from('invite_tokens')
      .update({ used: true })
      .eq('id', inv.id)

    redirect('/portal/tickets')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={register} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            {params.error && (
              <p className="text-sm text-destructive">{params.error}</p>
            )}
            <Button type="submit" className="w-full">Create account</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
