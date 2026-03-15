import { supabase } from "./supabase"
import type { Vehicle, AssessHistory, MarketPrice } from "./types"

// ── 在庫 ──────────────────────────────────────────────────────
export async function getVehicles() {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as Vehicle[]
}

export async function upsertVehicle(vehicle: Partial<Vehicle>) {
  const { data, error } = await supabase
    .from("vehicles")
    .upsert(vehicle)
    .select()
    .single()
  if (error) throw error
  return data as Vehicle
}

export async function deleteVehicle(id: string) {
  const { error } = await supabase.from("vehicles").delete().eq("id", id)
  if (error) throw error
}

// ── 査定履歴 ─────────────────────────────────────────────────
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
    .neq("id", "00000000-0000-0000-0000-000000000000") // 全件削除
  if (error) throw error
}

// ── 市場価格 ─────────────────────────────────────────────────
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
  const { error } = await supabase.from("market_prices").delete().eq("id", id)
  if (error) throw error
}

// ── ダッシュボード用集計 ──────────────────────────────────────
export async function getDashboardStats() {
  const [vehicles, assessHistory] = await Promise.all([
    getVehicles(),
    getAssessHistory(100),
  ])

  const inStock = vehicles.filter((v) => v.status === "in_stock").length
  const listed = vehicles.filter((v) => v.status === "listed").length
  const sold = vehicles.filter((v) => v.status === "sold")
  const totalRevenue = sold.reduce((s, v) => s + v.target_price, 0)
  const totalCost = sold.reduce((s, v) => s + v.purchase_price, 0)
  const grossProfit = totalRevenue - totalCost

  return {
    inStock,
    listed,
    soldCount: sold.length,
    totalRevenue,
    grossProfit,
    assessCount: assessHistory.length,
  }
}
