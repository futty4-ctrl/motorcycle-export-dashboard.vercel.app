"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * auction_history と inventory_items から型式（chassis_number の先頭部分）を
 * ユニーク抽出して返す。例: "NC42-1234567" → "NC42"
 */
export async function getChassisPrefixes(
  maker?: string | null,
  modelName?: string | null
): Promise<{
  success: boolean
  prefixes: string[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()

    // auction_history
    let q1 = supabase
      .from("auction_history")
      .select("chassis_number, model_name")
      .not("chassis_number", "is", null)
      .limit(5000)
    if (modelName) q1 = q1.ilike("model_name", `%${modelName}%`)
    const { data: histData } = await q1

    // inventory_items
    let q2 = supabase
      .from("inventory_items")
      .select("chassis_number, model_type, maker, model_name")
      .limit(2000)
    if (maker) q2 = q2.eq("maker", maker)
    if (modelName) q2 = q2.ilike("model_name", `%${modelName}%`)
    const { data: invData } = await q2

    const prefixSet = new Set<string>()

    for (const r of histData ?? []) {
      const ch = r.chassis_number as string | null
      if (!ch) continue
      // "NC42-1234*" から "NC42" を抽出
      const m = ch.match(/^([A-Z][A-Z0-9]*)[-\s]/)
      if (m) prefixSet.add(m[1])
    }

    for (const r of invData ?? []) {
      const mt = (r.model_type as string | null)?.trim()
      if (mt) prefixSet.add(mt)
      const ch = r.chassis_number as string | null
      if (ch) {
        const m = ch.match(/^([A-Z][A-Z0-9]*)[-\s]/)
        if (m) prefixSet.add(m[1])
      }
    }

    const prefixes = Array.from(prefixSet).filter((p) => p.length >= 2).sort()
    return { success: true, prefixes }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得失敗"
    return { success: false, prefixes: [], error: message }
  }
}
