"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

function generateManagementCode(): string {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "")
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let random = ""
  for (let i = 0; i < 4; i++) {
    random += chars[Math.floor(Math.random() * chars.length)]
  }
  return `INV-${dateStr}-${random}`
}

export type InventoryItemRow = {
  id: string
  management_code: string
  purchase_date: string
  category: string
  maker: string | null
  model_name: string | null
  model_type: string | null
  chassis_number: string | null
  purchase_price: number | null
  condition_memo: string | null
  status: string
  seller_name: string | null
  seller_age: string | null
  seller_address: string | null
  seller_occupation: string | null
  id_verification_method: string | null
  sold_price: number | null
  sold_date: string | null
  cc_range: string | null
  bds_venue: string | null
  created_at: string
  updated_at: string
}

export type InventoryItemInsert = {
  purchase_date?: string
  category?: string
  maker?: string | null
  model_name?: string | null
  model_type?: string | null
  chassis_number?: string | null
  purchase_price?: number | null
  condition_memo?: string | null
  status?: string
  seller_name?: string | null
  seller_age?: string | null
  seller_address?: string | null
  seller_occupation?: string | null
  id_verification_method?: string | null
  cc_range?: string | null
  bds_venue?: string | null
}

export async function getInventoryItems(): Promise<{
  success: boolean
  items?: InventoryItemRow[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, items: (data ?? []) as InventoryItemRow[] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "在庫の取得に失敗しました"
    return { success: false, error: msg }
  }
}

export async function createInventoryItem(
  input: InventoryItemInsert
): Promise<{
  success: boolean
  item?: InventoryItemRow
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()

    let managementCode = generateManagementCode()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("management_code", managementCode)
        .single()

      if (!existing) break
      managementCode = generateManagementCode()
      attempts++
    }

    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        management_code: managementCode,
        purchase_date: input.purchase_date ?? today,
        category: input.category ?? "車体",
        maker: input.maker ?? null,
        model_name: input.model_name ?? null,
        model_type: input.model_type ?? null,
        chassis_number: input.chassis_number ?? null,
        purchase_price: input.purchase_price ?? 0,
        condition_memo: input.condition_memo ?? null,
        status: input.status ?? "未処理",
        seller_name: input.seller_name ?? null,
        seller_age: input.seller_age ?? null,
        seller_address: input.seller_address ?? null,
        seller_occupation: input.seller_occupation ?? null,
        id_verification_method: input.id_verification_method ?? null,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, item: data as InventoryItemRow }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "在庫の登録に失敗しました"
    return { success: false, error: msg }
  }
}

export async function getInventoryItemByManagementCode(
  managementCode: string
): Promise<{
  success: boolean
  item?: InventoryItemRow
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("management_code", managementCode)
      .single()

    if (error || !data) {
      return { success: false, error: error?.message ?? "データが見つかりません" }
    }
    return { success: true, item: data as InventoryItemRow }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "在庫の取得に失敗しました"
    return { success: false, error: msg }
  }
}

export async function updateInventoryItemStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from("inventory_items")
      .update({ status })
      .eq("id", id)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ステータスの更新に失敗しました"
    return { success: false, error: msg }
  }
}

export async function updateInventoryItemSold(
  id: string,
  sold_price: number,
  sold_date: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()

    // 1. 売却情報を更新
    const { data: updated, error } = await supabase
      .from("inventory_items")
      .update({ sold_price, sold_date, status: "売却済" })
      .eq("id", id)
      .select("maker, model_name")
      .single()

    if (error) return { success: false, error: error.message }

    // 2. 同車種の売却実績から相場マスターを自動更新（3件以上あるとき）
    const maker = updated?.maker
    const model = updated?.model_name
    if (maker && model) {
      const { data: sold } = await supabase
        .from("inventory_items")
        .select("sold_price")
        .eq("maker", maker)
        .eq("model_name", model)
        .eq("status", "売却済")
        .not("sold_price", "is", null)

      const prices = (sold ?? []).map((r) => Number(r.sold_price)).filter((p) => p > 0)
      if (prices.length >= 1) {
        const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
        const sorted = [...prices].sort((a, b) => a - b)
        const pct25 = sorted[Math.floor(sorted.length * 0.25)] ?? sorted[0]
        const pct75 = sorted[Math.floor(sorted.length * 0.75)] ?? sorted[sorted.length - 1]
        const now = new Date().toISOString()
        const { data: existing } = await supabase
          .from("market_prices")
          .select("id")
          .eq("maker", maker)
          .eq("model", model)
          .maybeSingle()
        if (existing?.id) {
          await supabase
            .from("market_prices")
            .update({ avg_price: avg, min_price: pct25, max_price: pct75, sample_count: prices.length, updated_at: now })
            .eq("id", existing.id)
        } else {
          await supabase.from("market_prices").insert({
            maker, model, avg_price: avg, min_price: pct25, max_price: pct75,
            sample_count: prices.length, source: "ヤフオク", condition: "B",
            trend: "flat", trend_pct: 0, updated_at: now,
          })
        }
      }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "売却情報の更新に失敗しました"
    return { success: false, error: msg }
  }
}

// ── BDS費用テーブル（Aメンバー）──────────────────────────────
const BDS_FEES_A = [
  { max: 50000, fee: 3205 },
  { max: 100000, fee: 4389 },
  { max: 200000, fee: 5792 },
  { max: 300000, fee: 6327 },
  { max: 400000, fee: 7081 },
  { max: 500000, fee: 7709 },
  { max: 600000, fee: 8464 },
  { max: Infinity, fee: 9113 },
]
const YAHOO_FEE_CONST = 2680
const SHIPPING_BY_VENUE: Record<string, number> = {
  大阪: 0,
  関東: 12430,
  九州: 14300,
}

function getBDSFeeA(bid: number): number {
  for (const b of BDS_FEES_A) {
    if (bid < b.max) return b.fee
  }
  return BDS_FEES_A[BDS_FEES_A.length - 1].fee
}

function calcActualProfit(
  sold_price: number,
  purchase_price: number,
  bds_venue: string | null
): number {
  const shipping = SHIPPING_BY_VENUE[bds_venue ?? ""] ?? 0
  const bdsFee = getBDSFeeA(purchase_price)
  return sold_price - purchase_price - bdsFee - YAHOO_FEE_CONST - shipping
}

export type ModelRankRow = {
  model: string
  maker: string
  count: number
  totalProfit: number
  avgProfit: number
  avgDays: number
}

export type MonthlyRow = {
  month: string
  count: number
  profit: number
}

export type VenueRow = {
  venue: string
  count: number
  totalProfit: number
}

export type InventoryStats = {
  totalSold: number
  totalProfit: number
  avgProfit: number
  avgDaysToSell: number
  monthly: MonthlyRow[]
  modelRanking: ModelRankRow[]
  venueData: VenueRow[]
}

export async function getInventoryStats(): Promise<{
  success: boolean
  stats?: InventoryStats
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("inventory_items")
      .select("maker, model_name, purchase_price, sold_price, purchase_date, sold_date, bds_venue")
      .eq("status", "売却済")
      .not("sold_price", "is", null)
      .not("purchase_price", "is", null)
      .order("sold_date", { ascending: false })

    if (error) return { success: false, error: error.message }
    const items = data ?? []

    // 月次集計（最新12ヶ月）
    const monthlyMap = new Map<string, { count: number; profit: number }>()
    for (const item of items) {
      if (!item.sold_date) continue
      const month = item.sold_date.slice(0, 7) // "YYYY-MM"
      const profit = calcActualProfit(
        Number(item.sold_price),
        Number(item.purchase_price),
        item.bds_venue
      )
      const cur = monthlyMap.get(month) ?? { count: 0, profit: 0 }
      monthlyMap.set(month, { count: cur.count + 1, profit: cur.profit + profit })
    }
    const monthly: MonthlyRow[] = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, v]) => ({ month, ...v }))

    // 車種別集計
    type ModelAgg = { count: number; totalProfit: number; totalDays: number; daysCount: number }
    const modelMap = new Map<string, ModelAgg & { maker: string }>()
    for (const item of items) {
      const key = `${item.maker ?? "不明"}__${item.model_name ?? "不明"}`
      const profit = calcActualProfit(
        Number(item.sold_price),
        Number(item.purchase_price),
        item.bds_venue
      )
      const days =
        item.purchase_date && item.sold_date
          ? Math.max(
              0,
              Math.round(
                (new Date(item.sold_date).getTime() - new Date(item.purchase_date).getTime()) /
                  86400000
              )
            )
          : null
      const cur = modelMap.get(key) ?? { maker: item.maker ?? "不明", count: 0, totalProfit: 0, totalDays: 0, daysCount: 0 }
      modelMap.set(key, {
        maker: cur.maker,
        count: cur.count + 1,
        totalProfit: cur.totalProfit + profit,
        totalDays: cur.totalDays + (days ?? 0),
        daysCount: cur.daysCount + (days !== null ? 1 : 0),
      })
    }
    const modelRanking: ModelRankRow[] = [...modelMap.entries()]
      .map(([key, v]) => ({
        model: key.split("__")[1],
        maker: v.maker,
        count: v.count,
        totalProfit: v.totalProfit,
        avgProfit: v.count > 0 ? Math.round(v.totalProfit / v.count) : 0,
        avgDays: v.daysCount > 0 ? Math.round(v.totalDays / v.daysCount) : 0,
      }))
      .sort((a, b) => b.avgProfit - a.avgProfit)

    // BDS会場別
    const venueMap = new Map<string, { count: number; totalProfit: number }>()
    for (const item of items) {
      const venue = item.bds_venue ?? "不明"
      const profit = calcActualProfit(
        Number(item.sold_price),
        Number(item.purchase_price),
        item.bds_venue
      )
      const cur = venueMap.get(venue) ?? { count: 0, totalProfit: 0 }
      venueMap.set(venue, { count: cur.count + 1, totalProfit: cur.totalProfit + profit })
    }
    const venueData: VenueRow[] = [...venueMap.entries()].map(([venue, v]) => ({ venue, ...v }))

    // 全体集計
    const allProfits = items.map((item) =>
      calcActualProfit(Number(item.sold_price), Number(item.purchase_price), item.bds_venue)
    )
    const totalSold = items.length
    const totalProfit = allProfits.reduce((s, p) => s + p, 0)
    const avgProfit = totalSold > 0 ? Math.round(totalProfit / totalSold) : 0

    const allDays = items
      .filter((item) => item.purchase_date && item.sold_date)
      .map((item) =>
        Math.max(
          0,
          Math.round(
            (new Date(item.sold_date!).getTime() - new Date(item.purchase_date!).getTime()) /
              86400000
          )
        )
      )
    const avgDaysToSell =
      allDays.length > 0 ? Math.round(allDays.reduce((s, d) => s + d, 0) / allDays.length) : 0

    return {
      success: true,
      stats: { totalSold, totalProfit, avgProfit, avgDaysToSell, monthly, modelRanking, venueData },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "実績データの取得に失敗しました"
    return { success: false, error: msg }
  }
}

export async function getSoldItemsForMonth(
  year: number,
  month: number
): Promise<{
  success: boolean
  items?: InventoryItemRow[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("status", "売却済")
      .gte("sold_date", startDate)
      .lte("sold_date", endDate)
      .order("sold_date", { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, items: (data ?? []) as InventoryItemRow[] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "売却データの取得に失敗しました"
    return { success: false, error: msg }
  }
}
