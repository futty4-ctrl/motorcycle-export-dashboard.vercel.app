"use client"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export type BikeTypeCodeRow = {
  id: string
  type_code: string
  maker: string
  model: string
  cc: number
  aliases: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export type BikeTypeCodeInput = {
  type_code: string
  maker: string
  model: string
  cc: number
  aliases?: string[]
  notes?: string | null
}

export async function fetchBikeTypeCodes(): Promise<{
  data: BikeTypeCodeRow[]
  error: Error | null
}> {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("bike_type_codes")
      .select("*")
      .order("maker", { ascending: true })
      .order("model", { ascending: true })
      .order("type_code", { ascending: true })

    if (error) return { data: [], error: new Error(error.message) }
    return { data: (data ?? []) as BikeTypeCodeRow[], error: null }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error("型式マスター取得失敗"),
    }
  }
}

export async function lookupBikeTypeFromDb(
  code: string
): Promise<BikeTypeCodeRow | null> {
  if (!code) return null
  const upper = code.toUpperCase().replace(/[\s-].*$/, "")
  try {
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase
      .from("bike_type_codes")
      .select("*")
      .eq("type_code", upper)
      .maybeSingle()
    return (data as BikeTypeCodeRow) ?? null
  } catch {
    return null
  }
}

export async function upsertBikeTypeCode(
  input: BikeTypeCodeInput
): Promise<{ data: BikeTypeCodeRow | null; error: Error | null }> {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("bike_type_codes")
      .upsert(
        {
          type_code: input.type_code.toUpperCase().trim(),
          maker: input.maker.trim(),
          model: input.model.trim(),
          cc: input.cc,
          aliases: input.aliases ?? [],
          notes: input.notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "type_code" }
      )
      .select()
      .single()

    if (error) return { data: null, error: new Error(error.message) }
    return { data: data as BikeTypeCodeRow, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error("型式登録失敗"),
    }
  }
}

export async function deleteBikeTypeCode(
  id: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from("bike_type_codes")
      .delete()
      .eq("id", id)
    if (error) return { error: new Error(error.message) }
    return { error: null }
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("型式削除失敗"),
    }
  }
}

export async function bulkSuggestFromAuctionHistory(): Promise<{
  candidates: Array<{ type_code: string; maker: string; model: string; cc: number; sample_count: number }>
  error: Error | null
}> {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("auction_history")
      .select("model_type, maker, model_name, displacement_cc")
      .not("model_type", "is", null)
      .limit(5000)

    if (error) return { candidates: [], error: new Error(error.message) }

    const map = new Map<
      string,
      { maker: string; model: string; cc: number; count: number }
    >()
    for (const r of data ?? []) {
      const code = ((r.model_type as string) || "").toUpperCase().trim()
      if (!code || code.length < 3) continue
      const maker = (r.maker as string) || ""
      const model = (r.model_name as string) || ""
      const cc = typeof r.displacement_cc === "number" ? r.displacement_cc : 0
      if (!maker || !model) continue
      const cur = map.get(code)
      if (cur) {
        cur.count++
      } else {
        map.set(code, { maker, model, cc, count: 1 })
      }
    }

    const { data: existing } = await supabase
      .from("bike_type_codes")
      .select("type_code")
    const existingSet = new Set(
      (existing ?? []).map((e) => (e.type_code as string).toUpperCase())
    )

    const candidates = Array.from(map.entries())
      .filter(([code]) => !existingSet.has(code))
      .map(([code, v]) => ({
        type_code: code,
        maker: v.maker,
        model: v.model,
        cc: v.cc,
        sample_count: v.count,
      }))
      .sort((a, b) => b.sample_count - a.sample_count)

    return { candidates, error: null }
  } catch (err) {
    return {
      candidates: [],
      error: err instanceof Error ? err : new Error("候補抽出失敗"),
    }
  }
}
