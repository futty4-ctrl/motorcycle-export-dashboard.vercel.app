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
 * 売約済みで実績未入力の件数を取得
 */
export async function countUnfilledSold(): Promise<{
  success: boolean
  count: number
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { count, error } = await supabase
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "売約済み")
      .is("sold_price", null)
    if (error) throw error
    return { success: true, count: count ?? 0 }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, count: 0, error: message }
  }
}

/**
 * CSV一括更新: 管理コード・売却価格・売却日の3列で更新
 */
export async function bulkUpdateActualsByManagementCode(
  rows: Array<{
    management_code: string
    sold_price: number | null
    sold_date: string | null
  }>
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const supabase = createServerSupabaseClient()
  const errors: string[] = []
  let updated = 0
  for (const r of rows) {
    if (!r.management_code) {
      errors.push("管理コードなし")
      continue
    }
    const { error } = await supabase
      .from("inventory_items")
      .update({
        sold_price: r.sold_price,
        sold_date: r.sold_date,
        status: "売約済み",
      })
      .eq("management_code", r.management_code)
    if (error) {
      errors.push(`${r.management_code}: ${error.message}`)
    } else {
      updated++
    }
  }
  return { success: errors.length === 0, updated, errors }
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
