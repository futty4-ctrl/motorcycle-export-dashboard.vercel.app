"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type OwnMarketStats = {
  count: number
  median: number
  avg: number
  min: number
  max: number
  totalProfit: number
  avgProfit: number
  avgDaysInStock: number
}

/**
 * 自社売却済データから、指定された車種・モデル名に合致するものの統計を返す。
 * maker/modelName/modelType のいずれかでマッチさせる。
 */
export async function getOwnMarketStats(params: {
  makerKeyword?: string
  modelKeyword?: string // 車名の一部（例: "モンキー"）
  katashiki?: string // 型式（例: "Z50J"）
}): Promise<{
  success: boolean
  error?: string
  stats?: OwnMarketStats | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    let q = supabase
      .from("inventory_items")
      .select("sold_price, actual_profit, days_in_stock, maker, model_name, model_type")
      .not("sold_price", "is", null)

    const { data, error } = await q
    if (error) throw error

    const rows = (data ?? []) as Array<{
      sold_price: number | null
      actual_profit: number | null
      days_in_stock: number | null
      maker: string | null
      model_name: string | null
      model_type: string | null
    }>

    // クライアント側でキーワードフィルタ（OR 条件）
    const filtered = rows.filter((r) => {
      const hay = `${r.maker ?? ""} ${r.model_name ?? ""} ${r.model_type ?? ""}`.toLowerCase()
      if (params.makerKeyword && !hay.includes(params.makerKeyword.toLowerCase())) {
        return false
      }
      if (
        params.modelKeyword &&
        !hay.includes(params.modelKeyword.toLowerCase())
      ) {
        return false
      }
      if (params.katashiki && !hay.includes(params.katashiki.toLowerCase())) {
        return false
      }
      return true
    })

    if (filtered.length === 0) {
      return { success: true, stats: null }
    }

    const num = (v: number | null): number => (typeof v === "number" ? v : 0)
    const prices = filtered
      .map((r) => num(r.sold_price))
      .filter((n) => n > 0)
      .sort((a, b) => a - b)
    if (prices.length === 0) return { success: true, stats: null }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
    const avg = (arr: number[]) => (arr.length === 0 ? 0 : sum(arr) / arr.length)

    const profits = filtered.map((r) => num(r.actual_profit))
    const daysInStock = filtered
      .map((r) => num(r.days_in_stock))
      .filter((n) => n > 0)

    const stats: OwnMarketStats = {
      count: prices.length,
      median: Math.round(prices[Math.floor(prices.length / 2)]),
      avg: Math.round(avg(prices)),
      min: prices[0],
      max: prices[prices.length - 1],
      totalProfit: Math.round(sum(profits)),
      avgProfit: Math.round(avg(profits)),
      avgDaysInStock: Math.round(avg(daysInStock)),
    }

    return { success: true, stats }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, error: message }
  }
}
