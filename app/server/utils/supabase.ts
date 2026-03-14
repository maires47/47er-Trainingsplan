import { createClient } from '@supabase/supabase-js'

// Service-Client für Server-Operationen (umgeht RLS für Admin-Aktionen)
export function useSupabaseService() {
  const config = useRuntimeConfig()
  return createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )
}
