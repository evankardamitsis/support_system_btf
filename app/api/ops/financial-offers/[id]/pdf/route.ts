import { createClient } from '@/lib/supabase/server'
import { isBtfStaffRole } from '@/lib/auth/staff'
import { getCompanyProfile, toCompanyProfileData } from '@/lib/ops/company-profile'
import { loadOfferForPdf, renderOffer } from '@/lib/ops/financial-offer/service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isBtfStaffRole(profile?.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const loaded = await loadOfferForPdf(supabase, id)
  if (!loaded) return new Response('Not found', { status: 404 })

  try {
    const company = toCompanyProfileData(await getCompanyProfile(supabase))
    const pdf = await renderOffer(loaded.offer, company)

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${loaded.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[financial-offer] PDF render failed:', err)
    return new Response('Could not generate PDF', { status: 500 })
  }
}
