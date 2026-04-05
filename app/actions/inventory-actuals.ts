"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { InventoryActualsUpdate } from "@/lib/db/types"

/**
 * 在庫（inventory_items）の出品実績・売却結果を更新。
 * sold_price/sold_date が揃うと DB トリガー calc_actual_profit() が
 * actual_profit と days_in_stock を自動算出する。
 */
export async function updateInventoryActuals(
  inventoryId: string,
  updates: InventoryActualsUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from("inventory_items")
      .update(updates)
      .eq("id", inventoryId)
    if (error) throw error
    return { success: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "実績の保存に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 管理コードから在庫を取得（実績カラム含む）
 */
export async function getInventoryActuals(managementCode: string): Promise<{
  success: boolean
  error?: string
  data?: Record<string, unknown> | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("management_code", managementCode)
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, error: message }
  }
}
