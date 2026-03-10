"use client"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

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

export async function fetchInventoryItems(): Promise<{
  data: InventoryItemRow[] | null
  error: Error | null
}> {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return { data: null, error: new Error(error.message) }
    }
    return { data: (data ?? []) as InventoryItemRow[], error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error("在庫の取得に失敗しました"),
    }
  }
}

export type InventoryInsertInput = {
  purchase_date: string
  category: string
  maker?: string | null
  model_name?: string | null
  model_type?: string | null
  chassis_number?: string | null
  purchase_price?: number | null
  condition_memo?: string | null
  seller_name?: string | null
  seller_age?: string | null
  seller_address?: string | null
  seller_occupation?: string | null
  id_verification_method?: string | null
}

export async function getUniqueManagementCode(): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  let code = generateManagementCode()
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const { data } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("management_code", code)
      .single()

    if (!data) return code
    code = generateManagementCode()
    attempts++
  }
  return code
}

export async function insertInventoryItem(
  input: InventoryInsertInput
): Promise<{
  data: InventoryItemRow | null
  error: Error | null
}> {
  try {
    const supabase = createSupabaseBrowserClient()
    const managementCode = await getUniqueManagementCode()

    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        management_code: managementCode,
        purchase_date: input.purchase_date,
        category: input.category ?? "車体",
        maker: input.maker ?? null,
        model_name: input.model_name ?? null,
        model_type: input.model_type ?? null,
        chassis_number: input.chassis_number ?? null,
        purchase_price: input.purchase_price ?? 0,
        condition_memo: input.condition_memo ?? null,
        status: "未処理",
        seller_name: input.seller_name ?? null,
        seller_age: input.seller_age ?? null,
        seller_address: input.seller_address ?? null,
        seller_occupation: input.seller_occupation ?? null,
        id_verification_method: input.id_verification_method ?? null,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }
    return { data: data as InventoryItemRow, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error("在庫の登録に失敗しました"),
    }
  }
}

export async function updateInventoryItemStatus(
  id: string,
  status: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from("inventory_items")
      .update({ status })
      .eq("id", id)

    if (error) {
      return { error: new Error(error.message) }
    }
    return { error: null }
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("ステータスの更新に失敗しました"),
    }
  }
}

export async function fetchInventoryItemByManagementCode(
  managementCode: string
): Promise<{
  data: InventoryItemRow | null
  error: Error | null
}> {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("management_code", managementCode)
      .single()

    if (error || !data) {
      return {
        data: null,
        error: new Error(error?.message ?? "データが見つかりません"),
      }
    }
    return { data: data as InventoryItemRow, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error("在庫の取得に失敗しました"),
    }
  }
}
