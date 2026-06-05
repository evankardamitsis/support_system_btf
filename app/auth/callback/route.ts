import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { finalizeRegistration } from '@/lib/auth/finalize-registration'
import { getPostLoginPath } from '@/lib/auth/post-login'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/update-password`)
      }
      await finalizeRegistration(supabase)
      const path = await getPostLoginPath(supabase)
      return NextResponse.redirect(`${origin}${path}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Link+expired.+Request+a+new+one.`)
}
