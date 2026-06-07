import { NextResponse } from 'next/server'
import { isBtfStaffRole } from '@/lib/auth/staff'
import { getGiphyApiKey, type GiphyResult } from '@/lib/comms/giphy'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const apiKey = getGiphyApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: 'Giphy is not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isBtfStaffRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() ?? ''
  const trending = searchParams.get('trending') === '1'

  if (!query && !trending) {
    return NextResponse.json({ results: [] satisfies GiphyResult[] })
  }

  const url = new URL(
    query ? 'https://api.giphy.com/v1/gifs/search' : 'https://api.giphy.com/v1/gifs/trending'
  )

  url.searchParams.set('api_key', apiKey)
  if (query) url.searchParams.set('q', query)
  url.searchParams.set('limit', '24')
  url.searchParams.set('rating', 'pg')

  const response = await fetch(url, { next: { revalidate: 0 } })
  if (!response.ok) {
    return NextResponse.json({ error: 'Giphy search failed' }, { status: 502 })
  }

  const body = (await response.json()) as { data?: GiphyResult[] }
  return NextResponse.json({ results: body.data ?? [] })
}
