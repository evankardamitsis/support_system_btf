import { PageHeader } from '@/components/dashboard/PageHeader'
import { CompanyProfileForm } from '@/components/ops/CompanyProfileForm'
import { requireStaff } from '@/lib/auth/require-staff'
import { getCompanyProfileForOffers } from '@/lib/ops/company-profile'
import { createClient } from '@/lib/supabase/server'

export default async function CompanySettingsPage() {
  await requireStaff()
  const supabase = await createClient()
  const { profile, ibans } = await getCompanyProfileForOffers(supabase)

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <PageHeader
        title="Company settings"
        description="Letterhead, contact details, default upfront %, and IBANs used on financial offers."
      />

      <CompanyProfileForm profile={profile} ibans={ibans} />
    </div>
  )
}
