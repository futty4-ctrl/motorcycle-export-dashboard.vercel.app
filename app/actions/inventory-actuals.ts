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
 * 入荷から7日以上経過しているのに出品ステータスになっていない在庫を取得
 * 遅延警告用：未処理・出品準備中のまま放置されてる車両を検出
 */
export async function listStaleInventory(dayThreshold = 7): Promise<{
  success: boolean
  count: number
  items: Array<{
    id: string
    management_code: string
    model_name: string | null
    maker: string | null
    status: string
    purchase_date: string
    daysElapsed: number
  }>
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - dayThreshold)
    const cutoffDate = cutoff.toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, management_code, model_name, maker, status, purchase_date")
      .in("status", ["未処理", "出品準備中"])
      .lte("purchase_date", cutoffDate)
      .order("purchase_date", { ascending: true })
    if (error) throw error

    const today = new Date()
    const items = (data ?? []).map((r) => {
      const purchase = new Date(r.purchase_date)
      const days = Math.floor((today.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: r.id,
        management_code: r.management_code,
        model_name: r.model_name,
        maker: r.maker,
        status: r.status,
        purchase_date: r.purchase_date,
        daysElapsed: days,
      }
    })
    return { success: true, count: items.length, items }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, count: 0, items: [], error: message }
  }
}

/**
 * 最後の売却実績入力からの経過日数
 * 週次リマインダー用
 */
export async function getLastActualInputDate(): Promise<{
  success: boolean
  lastDate: string | null
  daysSinceLastInput: number | null
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("inventory_items")
      .select("sold_date")
      .not("sold_date", "is", null)
      .order("sold_date", { ascending: false })
      .limit(1)
    if (error) throw error
    if (!data || data.length === 0) {
      return { success: true, lastDate: null, daysSinceLastInput: null }
    }
    const lastDate = data[0].sold_date as string
    const today = new Date()
    const last = new Date(lastDate)
    const days = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
    return { success: true, lastDate, daysSinceLastInput: days }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, lastDate: null, daysSinceLastInput: null, error: message }
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
