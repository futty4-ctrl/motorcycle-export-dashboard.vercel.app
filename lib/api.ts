import { supabase } from "./supabase"
import type { Vehicle, AssessHistory, MarketPrice } from "./types"

// ── 在庫（既存テーブルそのまま）────────────────────────────
export async function getVehicles() {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as Vehicle[]
}

export async function updateVehicleStatus(
  id: string,
  status: Vehicle["status"]
) {
  const { error } = await supabase
    .from("vehicles")
    .update({ status })
    .eq("id", id)
  if (error) throw error
}

// ── 査定履歴（新規テーブル）────────────────────────────────
export async function getAssessHistory(limit = 50) {
  const { data, error } = await supabase
    .from("assess_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as AssessHistory[]
}

export async function insertAssessHistory(
  entry: Omit<AssessHistory, "id" | "created_at">
) {
  const { data, error } = await supabase
    .from("assess_history")
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data as AssessHistory
}

export async function clearAssessHistory() {
  const { error } = await supabase
    .from("assess_history")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) throw error
}

// ── 市場価格（新規テーブル）────────────────────────────────
export async function getMarketPrices() {
  const { data, error } = await supabase
    .from("market_prices")
    .select("*")
    .order("updated_at", { ascending: false })
  if (error) throw error
  return data as MarketPrice[]
}

export async function upsertMarketPrice(entry: Partial<MarketPrice>) {
  const { data, error } = await supabase
    .from("market_prices")
    .upsert(entry)
    .select()
    .single()
  if (error) throw error
  return data as MarketPrice
}

export async function deleteMarketPrice(id: string) {
  const { error } = await supabase
    .from("market_prices")
    .delete()
    .eq("id", id)
  if (error) throw error
}
