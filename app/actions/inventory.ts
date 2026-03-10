"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

function generateManagementCode(): string {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "")
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let random = ""
  for (let i = 0; i < 4; i++) {
    random += chars[Math.floor(Math.random() * chars.length)]
  }
  return `INV-${dateStr}-${random}`
}

export type InventoryItemRow = {
  id: string
  management_code: string
  purchase_date: string
  category: string
  maker: string | null
  model_name: string | null
  model_type: string | null
  chassis_number: string | null
  purchase_price: number | null
  condition_memo: string | null
  status: string
  seller_name: string | null
  seller_age: string | null
  seller_address: string | null
  seller_occupation: string | null
  id_verification_method: string | null
  created_at: string
  updated_at: string
}

export type InventoryItemInsert = {
  purchase_date?: string
  category?: string
  maker?: string | null
  model_name?: string | null
  model_type?: string | null
  chassis_number?: string | null
  purchase_price?: number | null
  condition_memo?: string | null
  status?: string
  seller_name?: string | null
  seller_age?: string | null
  seller_address?: string | null
  seller_occupation?: string | null
  id_verification_method?: string | null
}

export async function getInventoryItems(): Promise<{
  success: boolean
  items?: InventoryItemRow[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, items: (data ?? []) as InventoryItemRow[] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "在庫の取得に失敗しました"
    return { success: false, error: msg }
  }
}

export async function createInventoryItem(
  input: InventoryItemInsert
): Promise<{
  success: boolean
  item?: InventoryItemRow
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()

    let managementCode = generateManagementCode()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("management_code", managementCode)
        .single()

      if (!existing) break
      managementCode = generateManagementCode()
      attempts++
    }

    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        management_code: managementCode,
        purchase_date: input.purchase_date ?? today,
        category: input.category ?? "車体",
        maker: input.maker ?? null,
        model_name: input.model_name ?? null,
        model_type: input.model_type ?? null,
        chassis_number: input.chassis_number ?? null,
        purchase_price: input.purchase_price ?? 0,
        condition_memo: input.condition_memo ?? null,
        status: input.status ?? "未処理",
        seller_name: input.seller_name ?? null,
        seller_age: input.seller_age ?? null,
        seller_address: input.seller_address ?? null,
        seller_occupation: input.seller_occupation ?? null,
        id_verification_method: input.id_verification_method ?? null,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, item: data as InventoryItemRow }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "在庫の登録に失敗しました"
    return { success: false, error: msg }
  }
}

export async function getInventoryItemByManagementCode(
  managementCode: string
): Promise<{
  success: boolean
  item?: InventoryItemRow
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("management_code", managementCode)
      .single()

    if (error || !data) {
      return { success: false, error: error?.message ?? "データが見つかりません" }
    }
    return { success: true, item: data as InventoryItemRow }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "在庫の取得に失敗しました"
    return { success: false, error: msg }
  }
}

export async function updateInventoryItemStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from("inventory_items")
      .update({ status })
      .eq("id", id)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ステータスの更新に失敗しました"
    return { success: false, error: msg }
  }
}
