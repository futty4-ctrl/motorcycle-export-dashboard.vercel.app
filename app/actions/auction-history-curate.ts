"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type ModelNameGroup = {
  normalized: string
  count: number
  soldCount: number
  avgSoldPrice: number | null
  variants: string[]
}

/**
 * auction_history の model_name をユニークに集計し、
 * 類似グループで束ねる（表記ゆれ統一のため）。
 */
export async function listModelNameGroups(): Promise<{
  success: boolean
  groups: ModelNameGroup[]
  totalRecords: number
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("auction_history")
      .select("model_name, sold_price, result_status")
      .not("model_name", "is", null)
      .limit(5000)
    if (error) throw error
    const rows = data ?? []

    // normalize: 英数字のみにして大文字化、空白・ハイフン除去
    const normalize = (s: string) =>
      s
        .normalize("NFKC")
        .toUpperCase()
        .replace(/[\s\-−―ー・_]/g, "")
        .replace(/[\u30A0-\u30FF]/g, "")

    const groups = new Map<string, ModelNameGroup>()
    for (const r of rows) {
      if (!r.model_name) continue
      const key = normalize(r.model_name) || r.model_name
      if (!groups.has(key)) {
        groups.set(key, {
          normalized: key,
          count: 0,
          soldCount: 0,
          avgSoldPrice: null,
          variants: [],
        })
      }
      const g = groups.get(key)!
      g.count++
      if (r.result_status === "sold" && r.sold_price != null) {
        g.soldCount++
      }
      if (!g.variants.includes(r.model_name)) {
        g.variants.push(r.model_name)
      }
    }
    // 平均価格計算（2nd pass）
    for (const r of rows) {
      if (!r.model_name || r.result_status !== "sold" || r.sold_price == null) continue
      const key = normalize(r.model_name) || r.model_name
      const g = groups.get(key)
      if (!g) continue
      if (g.avgSoldPrice == null) {
        g.avgSoldPrice = r.sold_price
      } else {
        // 増分平均
        g.avgSoldPrice =
          (g.avgSoldPrice * (g.soldCount - 1) + r.sold_price) / g.soldCount
      }
    }

    const result = Array.from(groups.values())
      .filter((g) => g.count >= 1)
      .sort((a, b) => b.count - a.count)
    return { success: true, groups: result, totalRecords: rows.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, groups: [], totalRecords: 0, error: message }
  }
}

/**
 * 指定したバリアント群のmodel_nameを、正規表記に書き換える。
 */
export async function renameModelNameBulk(
  fromNames: string[],
  toName: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  if (fromNames.length === 0 || !toName) {
    return { success: false, updated: 0, error: "パラメータ不足" }
  }
  try {
    const supabase = createServerSupabaseClient()
    const { error, count } = await supabase
      .from("auction_history")
      .update({ model_name: toName }, { count: "exact" })
      .in("model_name", fromNames)
    if (error) throw error
    return { success: true, updated: count ?? 0 }
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新に失敗しました"
    return { success: false, updated: 0, error: message }
  }
}
