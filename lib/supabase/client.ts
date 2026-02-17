"use client"

import { createClient } from "@supabase/supabase-js"

/**
 * ブラウザ用 Supabase クライアント（匿名キー・RLS が有効）
 * Client Components から使用
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      "Supabase の設定がありません。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を .env.local に設定してください。"
    )
  }
  return createClient(url, key)
}
