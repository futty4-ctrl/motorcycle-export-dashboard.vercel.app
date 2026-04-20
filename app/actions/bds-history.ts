"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type BdsHistorySummary = {
  count: number
  soldCount: number
  soldRate: number
  avgSoldPrice: number | null
  medianSoldPrice: number | null
  minSoldPrice: number | null
  maxSoldPrice: number | null
  avgStartPrice: number | null
  recentSales: Array<{
    bds_lot_number: string | null
    model_name: string | null
    sold_price: number | null
    start_price: number | null
    region: string | null
    auction_date: string | null
    result_status: string | null
    mileage_km: number | null
  }>
}

/**
 * BDS落札履歴から指定モデルの相場を集計。
 * /auction-history に蓄積された1000件超のデータから活用。
 * - 部分一致検索（model_name が "CB400SF" を含む）
 * - 落札済み (result_status = "sold") のみ中央値等を計算
 */
export async function getBdsHistoryForModel(
  modelName: string | null,
  opts?: { limitMonths?: number }
): Promise<{
  success: boolean
  data: BdsHistorySummary | null
  error?: string
}> {
  if (!modelName) {
    return { success: true, data: emptySummary() }
  }
  try {
    const supabase = createServerSupabaseClient()
    let query = supabase
      .from("auction_history")
      .select(
        "bds_lot_number, model_name, sold_price, start_price, region, auction_date, result_status, mileage_km"
      )
      .ilike("model_name", `%${modelName}%`)
      .order("auction_date", { ascending: false })
      .limit(200)

    if (opts?.limitMonths) {
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - opts.limitMonths)
      query = query.gte("auction_date", cutoff.toISOString().slice(0, 10))
    }

    const { data, error } = await query
    if (error) throw error
    const rows = data ?? []
    if (rows.length === 0) {
      return { success: true, data: emptySummary() }
    }

    const sold = rows.filter((r) => r.result_status === "sold" && r.sold_price != null)
    const soldPrices = sold.map((r) => r.sold_price as number)
    const startPrices = rows
      .map((r) => r.start_price)
      .filter((v): v is number => v != null)

    const avg = (arr: number[]) =>
      arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length
    const median = (arr: number[]) => {
      if (arr.length === 0) return null
      const sorted = [...arr].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
    }

    return {
      success: true,
      data: {
        count: rows.length,
        soldCount: sold.length,
        soldRate: rows.length > 0 ? sold.length / rows.length : 0,
        avgSoldPrice: avg(soldPrices),
        medianSoldPrice: median(soldPrices),
        minSoldPrice: soldPrices.length > 0 ? Math.min(...soldPrices) : null,
        maxSoldPrice: soldPrices.length > 0 ? Math.max(...soldPrices) : null,
        avgStartPrice: avg(startPrices),
        recentSales: rows.slice(0, 15).map((r) => ({
          bds_lot_number: r.bds_lot_number,
          model_name: r.model_name,
          sold_price: r.sold_price,
          start_price: r.start_price,
          region: r.region,
          auction_date: r.auction_date,
          result_status: r.result_status,
          mileage_km: r.mileage_km,
        })),
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, data: null, error: message }
  }
}

function emptySummary(): BdsHistorySummary {
  return {
    count: 0,
    soldCount: 0,
    soldRate: 0,
    avgSoldPrice: null,
    medianSoldPrice: null,
    minSoldPrice: null,
    maxSoldPrice: null,
    avgStartPrice: null,
    recentSales: [],
  }
}
