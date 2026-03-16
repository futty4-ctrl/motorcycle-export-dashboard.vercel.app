"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { MarketPrice } from "@/lib/types"

export async function getMarketPrices(): Promise<{
  success: boolean
  rows?: MarketPrice[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("market_prices")
      .select("*")
      .order("updated_at", { ascending: false })
    if (error) throw error
    return { success: true, rows: (data ?? []) as unknown as MarketPrice[] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "相場データの取得に失敗しました"
    return { success: false, error: msg }
  }
}

export async function upsertMarketPrice(
  entry: Partial<MarketPrice>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from("market_prices")
      .upsert({ ...entry, updated_at: new Date().toISOString() })
    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "相場の保存に失敗しました"
    return { success: false, error: msg }
  }
}

export async function deleteMarketPrice(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from("market_prices").delete().eq("id", id)
    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "相場の削除に失敗しました"
    return { success: false, error: msg }
  }
}
