"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  InspectionChecklistItemRow,
  VehicleInspectionResultRow,
  InspectionResultStatus,
} from "@/lib/db/types"

/** チェックリスト項目マスタを取得（表示順） */
export async function getInspectionChecklistItems(): Promise<{
  success: boolean
  items?: InspectionChecklistItemRow[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("inspection_checklist_items")
      .select("id, category, label, sort_order, created_at")
      .order("sort_order", { ascending: true })

    if (error) throw error
    return { success: true, items: (data ?? []) as InspectionChecklistItemRow[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : "チェックリスト項目の取得に失敗しました"
    return { success: false, error: message }
  }
}

/** 指定車両のチェック結果を取得 */
export async function getVehicleInspectionResults(vehicleId: string): Promise<{
  success: boolean
  results?: VehicleInspectionResultRow[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("vehicle_inspection_results")
      .select("id, vehicle_id, item_id, status, note, checked_at, created_at, updated_at")
      .eq("vehicle_id", vehicleId)

    if (error) throw error
    return { success: true, results: (data ?? []) as VehicleInspectionResultRow[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : "チェック結果の取得に失敗しました"
    return { success: false, error: message }
  }
}

/** チェック結果を保存（upsert） */
export async function saveVehicleInspectionResult(params: {
  vehicleId: string
  itemId: string
  status: InspectionResultStatus
  note?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const checkedAt = ["ok", "ng"].includes(params.status) ? new Date().toISOString() : null

    const { error } = await supabase
      .from("vehicle_inspection_results")
      .upsert(
        {
          vehicle_id: params.vehicleId,
          item_id: params.itemId,
          status: params.status,
          note: params.note ?? null,
          checked_at: checkedAt,
        },
        { onConflict: "vehicle_id,item_id" }
      )

    if (error) throw error
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "チェック結果の保存に失敗しました"
    return { success: false, error: message }
  }
}
