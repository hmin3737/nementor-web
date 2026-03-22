import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 싱글턴 (클라이언트 컴포넌트용)
let _client: ReturnType<typeof createClient> | null = null
export function getSupabase() {
  if (!_client) _client = createClient()
  return _client
}
