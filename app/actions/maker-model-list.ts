"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type MakerModelEntry = {
  id: string
  maker: string
  model: string
  fullName: string
  count: number
  avgSoldPrice: number | null
}

/**
 * auction_history の model_name からメーカー＋車種のユニークリストを生成
 * market_prices の手動データに依存せず、実データから直接取得
 */
export async function getMakerModelList(): Promise<{
  success: boolean
  entries: MakerModelEntry[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("auction_history")
      .select("model_name, sold_price, result_status")
      .not("model_name", "is", null)
      .limit(10000)
    if (error) throw error

    const map = new Map<string, { count: number; soldPrices: number[] }>()
    for (const r of data ?? []) {
      const name = ((r.model_name as string) || "").trim()
      if (!name) continue
      if (!map.has(name)) {
        map.set(name, { count: 0, soldPrices: [] })
      }
      const m = map.get(name)!
      m.count++
      if (r.result_status === "sold" && typeof r.sold_price === "number" && r.sold_price > 0) {
        m.soldPrices.push(r.sold_price)
      }
    }

    const entries: MakerModelEntry[] = Array.from(map.entries())
      .map(([name, v]) => {
        const parts = name.split(/\s+/)
        const maker = parts[0] ?? ""
        const model = parts.slice(1).join(" ") || name
        const avg = v.soldPrices.length > 0
          ? v.soldPrices.reduce((a, b) => a + b, 0) / v.soldPrices.length
          : null
        return {
          id: name,
          maker,
          model,
          fullName: name,
          count: v.count,
          avgSoldPrice: avg,
        }
      })
      .filter((e) => e.count >= 1)
      .sort((a, b) => {
        if (a.maker !== b.maker) return a.maker.localeCompare(b.maker)
        return a.model.localeCompare(b.model)
      })

    return { success: true, entries }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得失敗"
    return { success: false, entries: [], error: message }
  }
}
