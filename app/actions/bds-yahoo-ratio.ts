"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type BdsYahooRatio = {
  overall: number // 全体平均
  medianRatio: number // 中央値
  sampleSize: number
  byCategory: Record<string, number>
  byModel: Record<string, { ratio: number; count: number }>
  confidence: "high" | "medium" | "low" // 信頼度
}

/**
 * 自分の実績から BDS仕入価格 → ヤフオク売却価格 の倍率係数を算出
 * - inventory_items から purchase_price と sold_price のペアを取得
 * - 車種別 / カテゴリ別 / 全体 の係数を算出
 */
export async function computeBdsYahooRatio(): Promise<{
  success: boolean
  data: BdsYahooRatio | null
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("inventory_items")
      .select("model_name, category, maker, purchase_price, sold_price, bds_fee_actual, transport_cost_actual")
      .not("purchase_price", "is", null)
      .not("sold_price", "is", null)
      .gt("purchase_price", 0)
      .gt("sold_price", 0)
      .limit(2000)
    if (error) throw error
    const rows = data ?? []
    if (rows.length === 0) {
      return {
        success: true,
        data: {
          overall: 1.4,
          medianRatio: 1.4,
          sampleSize: 0,
          byCategory: {},
          byModel: {},
          confidence: "low",
        },
      }
    }

    const ratios: number[] = []
    const byCategory: Record<string, number[]> = {}
    const byModel: Record<string, number[]> = {}

    for (const r of rows) {
      if (!r.purchase_price || !r.sold_price) continue
      // ヤフオク売価 / BDS落札価格（純粋な仕入価格）の倍率
      // 注: purchase_price は BDSの落札価格。BDS手数料等は含まれない前提
      const ratio = r.sold_price / r.purchase_price
      if (ratio < 0.5 || ratio > 5) continue // 外れ値除外
      ratios.push(ratio)
      if (r.category) {
        if (!byCategory[r.category]) byCategory[r.category] = []
        byCategory[r.category].push(ratio)
      }
      if (r.model_name) {
        if (!byModel[r.model_name]) byModel[r.model_name] = []
        byModel[r.model_name].push(ratio)
      }
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
    const median = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
    }

    const overall = ratios.length > 0 ? avg(ratios) : 1.4
    const medianRatio = ratios.length > 0 ? median(ratios) : 1.4

    const byCategoryResult: Record<string, number> = {}
    for (const [k, v] of Object.entries(byCategory)) {
      if (v.length >= 2) byCategoryResult[k] = median(v)
    }

    const byModelResult: Record<string, { ratio: number; count: number }> = {}
    for (const [k, v] of Object.entries(byModel)) {
      if (v.length >= 1) byModelResult[k] = { ratio: median(v), count: v.length }
    }

    const confidence: "high" | "medium" | "low" =
      ratios.length >= 30 ? "high" : ratios.length >= 10 ? "medium" : "low"

    return {
      success: true,
      data: {
        overall,
        medianRatio,
        sampleSize: ratios.length,
        byCategory: byCategoryResult,
        byModel: byModelResult,
        confidence,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, data: null, error: message }
  }
}
