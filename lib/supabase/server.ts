import { createClient } from "@supabase/supabase-js"

/**
 * サーバー用 Supabase クライアント（サービスロールキー使用・権限強め）
 * Server Components / Server Actions から使用
 */
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Supabase の設定がありません。NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。"
    )
  }
  return createClient(url, key)
}
