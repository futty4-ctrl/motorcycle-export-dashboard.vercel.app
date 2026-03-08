/**
 * vehicle-images バケット: 車両ごとの画像一覧・取得・アップロード
 * パス形式: vehicle-images/{vehicleId}/{filename}
 */

import { createServerSupabaseClient } from "@/lib/supabase/server"

const BUCKET = "vehicle-images"
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp)$/i

export type VehicleImageItem = {
  path: string
  name: string
  mimeType: string
}

/**
 * 車両フォルダ内の画像ファイルを一覧（先頭から limit 件）
 */
export async function listVehicleImages(
  vehicleId: string,
  limit = 50
): Promise<VehicleImageItem[]> {
  const supabase = createServerSupabaseClient()
  const { data: list, error } = await supabase.storage
    .from(BUCKET)
    .list(vehicleId, { limit, sortBy: { column: "name", order: "asc" } })
  if (error) return []
  const items: VehicleImageItem[] = []
  for (const f of list ?? []) {
    if (f.name && IMAGE_EXT.test(f.name)) {
      const path = `${vehicleId}/${f.name}`
      const mimeType = f.name.toLowerCase().endsWith(".png")
        ? "image/png"
        : f.name.toLowerCase().endsWith(".webp")
          ? "image/webp"
          : "image/jpeg"
      items.push({ path, name: f.name, mimeType })
    }
  }
  return items
}

/**
 * 指定パスの画像を取得して base64 で返す
 */
export async function getVehicleImageAsBase64(
  path: string
): Promise<{ base64: string; mimeType: string } | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) return null
  const buf = Buffer.from(await data.arrayBuffer())
  const base64 = buf.toString("base64")
  const mimeType = data.type?.startsWith("image/") ? data.type : "image/jpeg"
  return { base64, mimeType }
}

/**
 * 1枚の画像を vehicle-images/{vehicleId}/{filename} にアップロード
 */
export async function uploadVehicleImageToStorage(
  vehicleId: string,
  filename: string,
  base64: string,
  mimeType: string
): Promise<{ publicUrl: string } | { error: string }> {
  const supabase = createServerSupabaseClient()
  const path = `${vehicleId}/${filename}`
  const buf = Buffer.from(base64, "base64")
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: mimeType,
    upsert: true,
  })
  if (error) return { error: error.message }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { publicUrl: data.publicUrl }
}
