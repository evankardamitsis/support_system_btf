import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../database.types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  }

  return browserClient
}
