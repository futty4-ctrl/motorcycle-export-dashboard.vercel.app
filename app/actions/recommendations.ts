"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

const YAHOO_FEE = 2680
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
const SHIPPING: Record<string, Record<string, number>> = {
  大阪: { "～125cc": 0, "126～750cc": 0 },
  関東: { "～125cc": 12430, "126～750cc": 12980 },
  九州: { "～125cc": 14300, "126～750cc": 15070 },
}

function getBDSFee(bid: number): number {
  for (const b of BDS_FEES_A) {
    if (bid < b.max) return b.fee
  }
  return BDS_FEES_A[BDS_FEES_A.length - 1].fee
}

function calcBorder(yahooPrice: number, shipping: number, targetProfit: number): number {
  let estimate = yahooPrice - shipping - YAHOO_FEE - targetProfit - 5000
  for (let i = 0; i < 10; i++) {
    if (estimate <= 0) return 0
    const fee = getBDSFee(estimate)
    const next = yahooPrice - shipping - fee - YAHOO_FEE - targetProfit
    if (Math.abs(next - estimate) < 1) return Math.max(0, Math.floor(next))
    estimate = next
  }
  return Math.max(0, Math.floor(estimate))
}

export type RecommendItem = {
  maker: string
  model: string
  category: string | null
  avgPrice: number
  border: number
  estProfit: number
  avgDaysToSell: number | null  // 実績あれば。なければ null
  actualSalesCount: number      // 実績売却台数
  recommendQty: number          // 推薦仕入れ台数
  reason: string
  hasActual: boolean
}

export type RecommendationResult = {
  monthTarget: number
  soldThisMonth: number
  remaining: number
  daysLeft: number
  dailyNeeded: number
  items: RecommendItem[]
}

export async function getRecommendations(
  monthTarget: number,
  venue: string,
  targetProfit: number
): Promise<{ success: boolean; result?: RecommendationResult; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()

    // 今月の売却済み台数
    const now = new Date()
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`
    const daysLeft = lastDay - now.getDate()

    const { data: soldThisMonthData } = await supabase
      .from("inventory_items")
      .select("id", { count: "exact" })
      .eq("status", "売却済")
      .gte("sold_date", startOfMonth)
      .lte("sold_date", endOfMonth)

    const soldThisMonth = soldThisMonthData?.length ?? 0
    const remaining = Math.max(0, monthTarget - soldThisMonth)
    const dailyNeeded = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining

    // 相場マスターから全車種取得
    const { data: marketRows, error: mErr } = await supabase
      .from("market_prices")
      .select("maker, model, avg_price, sample_count")
      .gt("avg_price", 0)
      .order("avg_price", { ascending: false })

    if (mErr) throw mErr
    if (!marketRows?.length) return { success: true, result: { monthTarget, soldThisMonth, remaining, daysLeft, dailyNeeded, items: [] } }

    // 売却実績（車種別：平均在庫日数・台数）
    const { data: soldAll } = await supabase
      .from("inventory_items")
      .select("maker, model_name, purchase_date, sold_date")
      .eq("status", "売却済")
      .not("purchase_date", "is", null)
      .not("sold_date", "is", null)

    type ActualAgg = { totalDays: number; count: number }
    const actualMap = new Map<string, ActualAgg>()
    for (const row of soldAll ?? []) {
      if (!row.maker || !row.model_name) continue
      const key = `${row.maker}__${row.model_name}`
      const days = Math.max(0, Math.round(
        (new Date(row.sold_date).getTime() - new Date(row.purchase_date).getTime()) / 86400000
      ))
      const cur = actualMap.get(key) ?? { totalDays: 0, count: 0 }
      actualMap.set(key, { totalDays: cur.totalDays + days, count: cur.count + 1 })
    }

    // 各車種をスコアリング
    const venueKey = venue
    const scored = marketRows.map((row) => {
      const key = `${row.maker}__${row.model}`

      // ccRangeは avg_price から推定（～5万 = 125cc以下、それ以上 = 126～750cc）
      const ccRange = row.avg_price < 150000 ? "～125cc" : "126～750cc"
      const shipping = SHIPPING[venueKey]?.[ccRange] ?? 0
      const border = calcBorder(row.avg_price, shipping, targetProfit)
      const estProfit = row.avg_price - border - shipping - YAHOO_FEE

      const actual = actualMap.get(key)
      const avgDays = actual ? Math.round(actual.totalDays / actual.count) : null
      const hasActual = !!actual

      // スコア = 利益 / 在庫日数（実績なければ10日と仮定）
      const assumedDays = avgDays ?? 10
      const score = estProfit / Math.max(assumedDays, 1)

      return {
        maker: row.maker ?? "",
        model: row.model ?? "",
        category: null as string | null,
        avgPrice: row.avg_price,
        border,
        estProfit,
        avgDaysToSell: avgDays,
        actualSalesCount: actual?.count ?? 0,
        score,
        hasActual,
      }
    })
    .filter((r) => r.border > 0 && r.estProfit > 0)
    .sort((a, b) => b.score - a.score)

    // 推薦台数を配分（スコア上位に多く割り当て）
    const top = scored.slice(0, 15)
    const totalScore = top.reduce((s, r) => s + r.score, 0)
    let allocated = 0

    const items: RecommendItem[] = top.map((r, i) => {
      const rawQty = totalScore > 0
        ? Math.max(1, Math.round((r.score / totalScore) * remaining))
        : Math.ceil(remaining / top.length)
      const qty = i === top.length - 1 ? Math.max(1, remaining - allocated) : rawQty
      allocated += qty

      let reason = ""
      if (r.hasActual && r.avgDaysToSell !== null) {
        reason = `実績${r.actualSalesCount}台・平均${r.avgDaysToSell}日で売却`
      } else {
        reason = "相場データあり・実績蓄積中"
      }
      if (r.estProfit >= 50000) reason += "・高利益"
      if (r.avgDaysToSell !== null && r.avgDaysToSell <= 7) reason += "・回転速い"

      return {
        maker: r.maker,
        model: r.model,
        category: r.category,
        avgPrice: r.avgPrice,
        border: r.border,
        estProfit: r.estProfit,
        avgDaysToSell: r.avgDaysToSell,
        actualSalesCount: r.actualSalesCount,
        recommendQty: qty,
        reason,
        hasActual: r.hasActual,
      }
    })

    return { success: true, result: { monthTarget, soldThisMonth, remaining, daysLeft, dailyNeeded, items } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "推薦データの取得に失敗しました"
    return { success: false, error: msg }
  }
}
