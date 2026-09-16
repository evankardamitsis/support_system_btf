'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth/require-staff'
import { PERFORMANCE_PROVIDER_CATALOG } from '@/lib/performance/catalog'
import { encryptPerformanceCredentials } from '@/lib/performance/crypto'
import { syncPerformanceAccount } from '@/lib/performance/service'
import { testProviderConnection } from '@/lib/performance/providerAdapters'
import { PERFORMANCE_PROVIDERS, type PerformanceProvider, type ProviderCredentials } from '@/lib/performance/types'

export type PerformanceActionState = {
  ok: boolean
  message: string
}

const INITIAL_STATE: PerformanceActionState = { ok: false, message: '' }

function performancePaths() {
  revalidatePath('/admin/performance')
  revalidatePath('/admin/performance/integrations')
}

function assertAdmin(role: string) {
  if (role !== 'admin') throw new Error('Admin access required')
}

function providerFrom(value: FormDataEntryValue | null): PerformanceProvider {
  const provider = String(value || '') as PerformanceProvider
  if (!PERFORMANCE_PROVIDERS.includes(provider)) throw new Error('Unknown performance provider')
  return provider
}

export async function createPerformanceAccount(
  _state: PerformanceActionState = INITIAL_STATE,
  formData: FormData
): Promise<PerformanceActionState> {
  void _state
  try {
    const { supabase, role } = await requireStaff()
    assertAdmin(role)
    const clientId = String(formData.get('clientId') || '')
    const currency = String(formData.get('currency') || 'EUR').trim().toUpperCase()
    const timezone = String(formData.get('timezone') || 'Europe/Athens').trim()
    const targetRoas = Number(formData.get('targetRoas') || 0) || null
    const targetCpa = Number(formData.get('targetCpa') || 0) || null
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single()
    if (clientError || !client) throw new Error(clientError?.message || 'Choose a client')

    const { error } = await supabase.from('performance_accounts').upsert(
      {
        client_id: client.id,
        display_name: client.name,
        currency,
        timezone,
        target_roas: targetRoas,
        target_cpa: targetCpa,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    )
    if (error) throw new Error(error.message)
    performancePaths()
    return { ok: true, message: `${client.name} is ready for provider connections.` }
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : 'Could not create workspace' }
  }
}

export async function savePerformanceConnection(
  _state: PerformanceActionState = INITIAL_STATE,
  formData: FormData
): Promise<PerformanceActionState> {
  void _state
  try {
    const { supabase, role } = await requireStaff()
    assertAdmin(role)
    const accountId = String(formData.get('accountId') || '')
    const provider = providerFrom(formData.get('provider'))
    const definition = PERFORMANCE_PROVIDER_CATALOG.find(item => item.id === provider)!
    const credentials = Object.fromEntries(
      definition.fields.map(field => [field.key, String(formData.get(field.key) || '').trim()])
    ) as ProviderCredentials

    for (const field of definition.fields) {
      if (field.required && !String((credentials as unknown as Record<string, string>)[field.key] || '')) {
        throw new Error(`${field.label} is required`)
      }
    }

    await testProviderConnection(provider, credentials)
    const values = credentials as unknown as Record<string, string>
    const externalAccountId =
      provider === 'shopify'
        ? values.shop
        : provider === 'meta'
          ? values.adAccountId
          : provider === 'google'
            ? values.customerId
            : 'Klaviyo account'
    const now = new Date().toISOString()
    const { error } = await supabase.from('performance_connections').upsert(
      {
        account_id: accountId,
        provider,
        status: 'connected',
        label: definition.name,
        external_account_id: externalAccountId,
        credentials_encrypted: encryptPerformanceCredentials(credentials),
        last_error: null,
        updated_at: now,
      },
      { onConflict: 'account_id,provider' }
    )
    if (error) throw new Error(error.message)

    performancePaths()
    return { ok: true, message: `${definition.name} connected. Run a sync to populate the dashboard.` }
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : 'Could not connect provider' }
  }
}

export async function disconnectPerformanceConnection(formData: FormData) {
  const { supabase, role } = await requireStaff()
  assertAdmin(role)
  const connectionId = String(formData.get('connectionId') || '')
  const { error } = await supabase.from('performance_connections').delete().eq('id', connectionId)
  if (error) throw new Error(error.message)
  performancePaths()
}

export async function syncPerformanceAccountAction(
  _state: PerformanceActionState = INITIAL_STATE,
  formData: FormData
): Promise<PerformanceActionState> {
  void _state
  try {
    await requireStaff()
    const accountId = String(formData.get('accountId') || '')
    const results = await syncPerformanceAccount(accountId)
    const succeeded = results.filter(result => result.ok).length
    const failed = results.filter(result => !result.ok)
    performancePaths()
    if (!results.length) return { ok: false, message: 'Connect at least one provider before syncing.' }
    if (failed.length) {
      return {
        ok: false,
        message: `${succeeded} synced · ${failed.map(item => `${item.provider}: ${item.error}`).join(' · ')}`,
      }
    }
    return { ok: true, message: `${succeeded} provider${succeeded === 1 ? '' : 's'} synced.` }
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : 'Sync failed' }
  }
}
