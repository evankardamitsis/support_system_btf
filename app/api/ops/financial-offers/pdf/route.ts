import { createClient } from '@/lib/supabase/server'
import { isBtfStaffRole } from '@/lib/auth/staff'
import { offerFilename, parseFinancialOfferInput } from '@/lib/ops/financial-offer/calculate'
import { getCompanyProfile, toCompanyProfileData } from '@/lib/ops/company-profile'
import { renderOffer } from '@/lib/ops/financial-offer/service'

/** Preview/download without saving — prefer submitFinancialOffer for persisted offers. */
export async function POST(request: Request) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const companyProfile = await getCompanyProfile(supabase)

  let offer
  try {
    offer = parseFinancialOfferInput(body)
    offer.upfrontPercent = companyProfile.upfrontPercent
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid offer data'
    return new Response(message, { status: 400 })
  }

  try {
    const company = toCompanyProfileData(companyProfile)
    const pdf = await renderOffer(offer, company)
    const filename = offerFilename(offer.clientName)

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[financial-offer] PDF render failed:', err)
    return new Response('Could not generate PDF', { status: 500 })
  }
}
