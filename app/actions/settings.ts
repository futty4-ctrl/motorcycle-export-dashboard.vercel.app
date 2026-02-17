"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type AppSettings = {
  domesticShippingJpy: number
  yahooFeesJpy: number
  yahooShippingJpy: number
  ebayFeesUsd: number
  ebayShippingUsd: number
  fallbackUsdJpy: number
}

const KEYS: (keyof AppSettings)[] = [
  "domesticShippingJpy",
  "yahooFeesJpy",
  "yahooShippingJpy",
  "ebayFeesUsd",
  "ebayShippingUsd",
  "fallbackUsdJpy",
]

const DB_KEY_MAP: Record<keyof AppSettings, string> = {
  domesticShippingJpy: "domestic_shipping_jpy",
  yahooFeesJpy: "yahoo_fees_jpy",
  yahooShippingJpy: "yahoo_shipping_jpy",
  ebayFeesUsd: "ebay_fees_usd",
  ebayShippingUsd: "ebay_shipping_usd",
  fallbackUsdJpy: "fallback_usd_jpy",
}

const DEFAULTS: AppSettings = {
  domesticShippingJpy: 30000,
  yahooFeesJpy: 10000,
  yahooShippingJpy: 5000,
  ebayFeesUsd: 50,
  ebayShippingUsd: 40,
  fallbackUsdJpy: 150,
}

function parseNumber(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val
  if (typeof val === "string") {
    const n = Number(val)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

/**
 * 設定を取得。未設定のキーはデフォルト値を返す
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: rows, error } = await supabase
      .from("settings")
      .select("key, value_json")
    if (error) throw error
    const map = new Map<string, number>()
    for (const row of rows ?? []) {
      const k = row.key as string
      const v = row.value_json
      map.set(k, parseNumber(typeof v === "string" ? v : (v as unknown)))
    }
    return {
      domesticShippingJpy: map.get("domestic_shipping_jpy") ?? DEFAULTS.domesticShippingJpy,
      yahooFeesJpy: map.get("yahoo_fees_jpy") ?? DEFAULTS.yahooFeesJpy,
      yahooShippingJpy: map.get("yahoo_shipping_jpy") ?? DEFAULTS.yahooShippingJpy,
      ebayFeesUsd: map.get("ebay_fees_usd") ?? DEFAULTS.ebayFeesUsd,
      ebayShippingUsd: map.get("ebay_shipping_usd") ?? DEFAULTS.ebayShippingUsd,
      fallbackUsdJpy: map.get("fallback_usd_jpy") ?? DEFAULTS.fallbackUsdJpy,
    }
  } catch {
    return DEFAULTS
  }
}

/**
 * 設定を更新（部分更新可）
 */
export async function updateSettings(
  partial: Partial<AppSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    for (const key of KEYS) {
      const value = partial[key]
      if (value === undefined) continue
      const dbKey = DB_KEY_MAP[key]
      const { error } = await supabase
        .from("settings")
        .upsert({ key: dbKey, value_json: value }, { onConflict: "key" })
      if (error) throw error
    }
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "設定の保存に失敗しました"
    return { success: false, error: message }
  }
}
