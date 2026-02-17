/**
 * 車種名から過去のBDS落札価格（bookmarklet シナリオの profit）の平均を取得する。
 * 仕入れ上限価格の算出に利用。
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export async function getBdsPastAverageByModelName(
  supabase: SupabaseClient,
  modelName: string
): Promise<{ averagePriceJpy: number; sampleCount: number }> {
  const q = (modelName ?? "").trim()
  if (!q) return { averagePriceJpy: 0, sampleCount: 0 }

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id")
    .ilike("chassis_number", `%${q}%`)

  const ids = (vehicles ?? []).map((v) => v.id).filter(Boolean)
  if (ids.length === 0) return { averagePriceJpy: 0, sampleCount: 0 }

  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("profit")
    .in("vehicle_id", ids)
    .eq("scenario_type", "bookmarklet")
    .gt("profit", 0)

  const profits = (scenarios ?? [])
    .map((s) => (typeof s.profit === "number" ? s.profit : 0))
    .filter((p) => p > 0)
  if (profits.length === 0) return { averagePriceJpy: 0, sampleCount: 0 }

  const sum = profits.reduce((a, b) => a + b, 0)
  return {
    averagePriceJpy: Math.round(sum / profits.length),
    sampleCount: profits.length,
  }
}

/** 外装コンディション（1〜5）に応じた相場係数。5・4=100%、3=80%、2=60%、1=40% */
export function getConditionCoefficient(exteriorCondition: number): number {
  if (exteriorCondition >= 5) return 1.0
  if (exteriorCondition >= 4) return 1.0
  if (exteriorCondition >= 3) return 0.8
  if (exteriorCondition >= 2) return 0.6
  if (exteriorCondition >= 1) return 0.4
  return 0.8
}
