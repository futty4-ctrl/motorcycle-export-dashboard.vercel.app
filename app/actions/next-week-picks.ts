"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { computeBdsYahooRatio } from "./bds-yahoo-ratio"

export type NextWeekPick = {
  rank: number
  modelName: string
  maker: string | null
  displacementCc: number | null
  score: number // 0-100
  bdsLotCount90d: number // 過去90日のBDS取扱件数
  bdsSoldCount90d: number
  bdsSoldMedian: number | null
  bdsSoldMin: number | null
  bdsSoldMax: number | null
  myProfitMedian: number | null // 自分の粗利中央値（売却実績）
  myCount: number // 自分が仕入れた回数
  myAvgDaysInStock: number | null
  estimatedCeilingPrice: number | null // 目標利益¥5万を残せる上限
  reason: string[]
}

/**
 * 次週のねらい目車種を自動算出
 * - auction_historyの過去90日データ
 * - inventory_itemsの自分の売却実績
 * - スコア計算で上位を推薦
 */
export async function getNextWeekPicks(opts?: {
  targetProfit?: number
  yahooFeeRate?: number
  auctionFeeRate?: number
  lookbackDays?: number
  limit?: number
}): Promise<{
  success: boolean
  picks: NextWeekPick[]
  totalModelsAnalyzed: number
  ratioUsed: number
  ratioConfidence: "high" | "medium" | "low"
  ratioSampleSize: number
  error?: string
}> {
  const targetProfit = opts?.targetProfit ?? 50000
  const yahooFeeRate = opts?.yahooFeeRate ?? 0.088
  const auctionFeeRate = opts?.auctionFeeRate ?? 0.10
  const lookbackDays = opts?.lookbackDays ?? 90
  const limit = opts?.limit ?? 15

  try {
    const supabase = createServerSupabaseClient()

    // BDS→ヤフオク係数を実績から学習
    const ratioRes = await computeBdsYahooRatio()
    const overallRatio = ratioRes.data?.overall ?? 1.4
    const ratioConfidence = ratioRes.data?.confidence ?? "low"
    const ratioSampleSize = ratioRes.data?.sampleSize ?? 0
    const modelRatios = ratioRes.data?.byModel ?? {}
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - lookbackDays)
    const cutoffDate = cutoff.toISOString().slice(0, 10)

    // auction_historyの過去90日データ
    const { data: histData, error: hErr } = await supabase
      .from("auction_history")
      .select("model_name, sold_price, result_status, auction_date, displacement_cc")
      .gte("auction_date", cutoffDate)
      .not("model_name", "is", null)
      .limit(5000)
    if (hErr) throw hErr

    // inventory_itemsの売却実績
    const { data: invData, error: iErr } = await supabase
      .from("inventory_items")
      .select("model_name, maker, actual_profit, days_in_stock, sold_price, purchase_price")
      .not("sold_price", "is", null)
      .not("model_name", "is", null)
      .limit(2000)
    if (iErr) throw iErr

    // 車種ごとに集計
    type Stats = {
      lotCount: number
      soldCount: number
      soldPrices: number[]
      myProfits: number[]
      myDays: number[]
      myCount: number
      maker: string | null
      ccSamples: number[]
    }
    const stats = new Map<string, Stats>()
    for (const r of histData ?? []) {
      if (!r.model_name) continue
      if (!stats.has(r.model_name)) {
        stats.set(r.model_name, {
          lotCount: 0,
          soldCount: 0,
          soldPrices: [],
          myProfits: [],
          myDays: [],
          myCount: 0,
          maker: null,
          ccSamples: [],
        })
      }
      const s = stats.get(r.model_name)!
      s.lotCount++
      if (r.displacement_cc != null) s.ccSamples.push(r.displacement_cc)
      if (r.result_status === "sold" && r.sold_price != null) {
        s.soldCount++
        s.soldPrices.push(r.sold_price)
      }
    }
    for (const r of invData ?? []) {
      if (!r.model_name) continue
      if (!stats.has(r.model_name)) {
        stats.set(r.model_name, {
          lotCount: 0,
          soldCount: 0,
          soldPrices: [],
          myProfits: [],
          myDays: [],
          myCount: 0,
          maker: r.maker,
          ccSamples: [],
        })
      }
      const s = stats.get(r.model_name)!
      s.myCount++
      if (r.maker && !s.maker) s.maker = r.maker
      if (r.actual_profit != null) s.myProfits.push(r.actual_profit)
      if (r.days_in_stock != null) s.myDays.push(r.days_in_stock)
    }

    const median = (arr: number[]) => {
      if (arr.length === 0) return null
      const sorted = [...arr].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
    }
    const avg = (arr: number[]) =>
      arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length

    // スコア算出
    const results: NextWeekPick[] = []
    const maxLotCount = Math.max(...Array.from(stats.values()).map((s) => s.lotCount), 1)
    const maxMyProfit = Math.max(
      ...Array.from(stats.values())
        .map((s) => median(s.myProfits) ?? 0)
        .filter((v) => v > 0),
      10000
    )

    for (const [modelName, s] of stats.entries()) {
      if (s.lotCount < 2 && s.myCount < 1) continue

      const bdsSoldMedian = median(s.soldPrices)
      const bdsSoldMin = s.soldPrices.length > 0 ? Math.min(...s.soldPrices) : null
      const bdsSoldMax = s.soldPrices.length > 0 ? Math.max(...s.soldPrices) : null
      const myProfitMedian = median(s.myProfits)
      const myAvgDays = avg(s.myDays)

      // 推定仕入上限: BDS中央値 × 実績から学習した係数 を使用
      // 車種別の係数があればそれを、なければ全体平均を使用
      const modelRatio = modelRatios[modelName]?.ratio
      const appliedRatio = modelRatio ?? overallRatio
      const estimatedYahooPrice = bdsSoldMedian ? bdsSoldMedian * appliedRatio : null
      const estimatedCeiling = estimatedYahooPrice
        ? Math.max(
            0,
            Math.floor(
              (estimatedYahooPrice * (1 - yahooFeeRate) - 20000 - 10000 - 700 - targetProfit) /
                (1 + auctionFeeRate)
            )
          )
        : null

      // スコア計算
      const scoreLot = Math.min((s.lotCount / maxLotCount) * 40, 40) // 40点満点
      const scoreProfit = myProfitMedian != null
        ? Math.min((myProfitMedian / maxMyProfit) * 35, 35) // 35点満点
        : s.myCount === 0 ? 15 : 0
      const scoreSpeed = myAvgDays != null
        ? Math.max(0, 25 - (myAvgDays / 30) * 25) // 25点満点（30日以内がベスト）
        : 10
      const score = Math.round(scoreLot + scoreProfit + scoreSpeed)

      // 理由タグ
      const reason: string[] = []
      if (s.lotCount >= 5) reason.push(`BDS${s.lotCount}件`)
      if (myProfitMedian != null && myProfitMedian >= 40000) reason.push(`粗利¥${Math.round(myProfitMedian / 1000)}k`)
      if (myAvgDays != null && myAvgDays <= 14) reason.push(`${Math.round(myAvgDays)}日で売却`)
      if (s.myCount === 0 && s.lotCount >= 3) reason.push("未仕入・候補")

      const displacementCc = s.ccSamples.length > 0 ? median(s.ccSamples) : null

      results.push({
        rank: 0,
        modelName,
        maker: s.maker,
        displacementCc,
        score,
        bdsLotCount90d: s.lotCount,
        bdsSoldCount90d: s.soldCount,
        bdsSoldMedian,
        bdsSoldMin,
        bdsSoldMax,
        myProfitMedian,
        myCount: s.myCount,
        myAvgDaysInStock: myAvgDays,
        estimatedCeilingPrice: estimatedCeiling,
        reason,
      })
    }

    results.sort((a, b) => b.score - a.score)
    const top = results.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }))

    return {
      success: true,
      picks: top,
      totalModelsAnalyzed: results.length,
      ratioUsed: overallRatio,
      ratioConfidence,
      ratioSampleSize,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return {
      success: false,
      picks: [],
      totalModelsAnalyzed: 0,
      ratioUsed: 1.4,
      ratioConfidence: "low",
      ratioSampleSize: 0,
      error: message,
    }
  }
}
