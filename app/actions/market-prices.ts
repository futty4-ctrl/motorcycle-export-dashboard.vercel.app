"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type MarketPriceRow = {
  id: string
  model_name: string
  bds_avg_jpy: number | null
  yahoo_avg_jpy: number | null
  created_at: string
  updated_at: string
}

export async function getMarketPrices(): Promise<{
  success: boolean
  rows?: MarketPriceRow[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("market_prices")
      .select("*")
      .order("model_name", { ascending: true })
    if (error) throw error
    return { success: true, rows: (data ?? []) as MarketPriceRow[] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "相場データの取得に失敗しました"
    return { success: false, error: msg }
  }
}

export async function upsertMarketPrice(params: {
  model_name: string
  bds_avg_jpy?: number | null
  yahoo_avg_jpy?: number | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from("market_prices").upsert(
      {
        model_name: params.model_name.trim(),
        bds_avg_jpy: params.bds_avg_jpy ?? null,
        yahoo_avg_jpy: params.yahoo_avg_jpy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "model_name" }
    )
    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "相場の保存に失敗しました"
    return { success: false, error: msg }
  }
}

export async function deleteMarketPrice(id: string): Promise<{
  success: boolean
  error?: string
}> {
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
