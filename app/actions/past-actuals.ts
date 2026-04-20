"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type PastActualsSummary = {
  count: number
  avgPurchasePrice: number | null
  avgSoldPrice: number | null
  medianSoldPrice: number | null
  avgProfit: number | null
  medianProfit: number | null
  avgDaysInStock: number | null
  recentSales: Array<{
    management_code: string
    purchase_price: number | null
    sold_price: number | null
    sold_date: string | null
    actual_profit: number | null
    days_in_stock: number | null
  }>
}

/**
 * 仕入ボーダー計算の参考データ:
 * 指定した車種/モデルの過去実績（仕入額・売却額・粗利の中央値/平均）を返す。
 * 売却済み・sold_price NOT NULL のみ対象。
 */
export async function getPastActualsForModel(
  maker: string | null,
  modelName: string | null
): Promise<{
  success: boolean
  data: PastActualsSummary | null
  error?: string
}> {
  if (!maker && !modelName) {
    return { success: true, data: emptySummary() }
  }
  try {
    const supabase = createServerSupabaseClient()
    let query = supabase
      .from("inventory_items")
      .select(
        "management_code, purchase_price, sold_price, sold_date, actual_profit, days_in_stock"
      )
      .not("sold_price", "is", null)
      .order("sold_date", { ascending: false })
      .limit(50)
    if (maker) query = query.eq("maker", maker)
    if (modelName) query = query.eq("model_name", modelName)

    const { data, error } = await query
    if (error) throw error
    const rows = data ?? []
    if (rows.length === 0) {
      return { success: true, data: emptySummary() }
    }

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

    const purchases = rows
      .map((r) => r.purchase_price)
      .filter((v): v is number => v != null)
    const solds = rows
      .map((r) => r.sold_price)
      .filter((v): v is number => v != null)
    const profits = rows
      .map((r) => r.actual_profit)
      .filter((v): v is number => v != null)
    const days = rows
      .map((r) => r.days_in_stock)
      .filter((v): v is number => v != null)

    return {
      success: true,
      data: {
        count: rows.length,
        avgPurchasePrice: avg(purchases),
        avgSoldPrice: avg(solds),
        medianSoldPrice: median(solds),
        avgProfit: avg(profits),
        medianProfit: median(profits),
        avgDaysInStock: avg(days),
        recentSales: rows.slice(0, 10).map((r) => ({
          management_code: r.management_code ?? "",
          purchase_price: r.purchase_price,
          sold_price: r.sold_price,
          sold_date: r.sold_date,
          actual_profit: r.actual_profit,
          days_in_stock: r.days_in_stock,
        })),
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, data: null, error: message }
  }
}

/**
 * 特定の evaluation から推定売価・車種情報を取得
 * auction-day の入札判断データを /bds-border で流用するため
 */
export async function getEvaluationSnapshot(evaluationId: string): Promise<{
  success: boolean
  data: {
    evaluationId: string
    estimatedSalePrice: number | null
    transportCost: number | null
    repairCostEstimate: number | null
    targetProfit: number | null
    bidLimitBest: number | null
    bidLimitMin: number | null
    vehicleCategory: string | null
    maker: string | null
    modelName: string | null
    chassisNumber: string | null
  } | null
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("evaluations")
      .select(
        "id, estimated_sale_price, transport_cost, repair_cost_estimate, target_profit, bid_limit_best, bid_limit_min, vehicle_category, vehicle:vehicles(chassis_number, name)"
      )
      .eq("id", evaluationId)
      .single()
    if (error) throw error
    if (!data) return { success: true, data: null }

    const vehicle = (data.vehicle as { chassis_number: string | null; name: string | null } | null) ?? null
    const vehicleName = vehicle?.name ?? ""
    const parts = vehicleName.split(/\s+/).filter(Boolean)
    const maker = parts[0] ?? null
    const modelName = parts.slice(1).join(" ") || null

    return {
      success: true,
      data: {
        evaluationId: data.id,
        estimatedSalePrice: data.estimated_sale_price,
        transportCost: data.transport_cost,
        repairCostEstimate: data.repair_cost_estimate,
        targetProfit: data.target_profit,
        bidLimitBest: data.bid_limit_best,
        bidLimitMin: data.bid_limit_min,
        vehicleCategory: data.vehicle_category,
        maker,
        modelName,
        chassisNumber: vehicle?.chassis_number ?? null,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, data: null, error: message }
  }
}

function emptySummary(): PastActualsSummary {
  return {
    count: 0,
    avgPurchasePrice: null,
    avgSoldPrice: null,
    medianSoldPrice: null,
    avgProfit: null,
    medianProfit: null,
    avgDaysInStock: null,
    recentSales: [],
  }
}
