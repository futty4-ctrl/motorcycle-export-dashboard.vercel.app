/**
 * 画像URLを取得して Supabase Storage の vehicle-images バケットにアップロードし、
 * 公開URLを返す。ブックマークレット用。
 * バケットが無い場合は自動作成を試行する。未作成の場合は Dashboard → Storage で
 * バケット「vehicle-images」を public で作成してください。
 */

import { createServerSupabaseClient } from "@/lib/supabase/server"

const BUCKET = "vehicle-images"
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function fetchAndUploadVehicleImage(
  imageUrl: string,
  vehicleId: string
): Promise<{ publicUrl: string } | { error: string }> {
  let buffer: ArrayBuffer
  let contentType = "image/jpeg"
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*",
        Referer: new URL(imageUrl).origin + "/",
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      return { error: `画像の取得に失敗しました: ${res.status}` }
    }
    const ct = res.headers.get("content-type")
    if (ct?.startsWith("image/")) contentType = ct.split(";")[0].trim()
    buffer = await res.arrayBuffer()
  } catch (e) {
    const msg = e instanceof Error ? e.message : "画像の取得に失敗しました"
    return { error: msg }
  }

  if (buffer.byteLength > MAX_SIZE) {
    return { error: "画像サイズが大きすぎます（5MB以下）" }
  }

  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg"
  const path = `${vehicleId}/main.${ext}`

  const supabase = createServerSupabaseClient()

  try {
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: true,
    })
    if (uploadError) {
      if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("not found")) {
        const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: MAX_SIZE,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        })
        if (!createErr) {
          const { error: retryErr } = await supabase.storage.from(BUCKET).upload(path, buffer, {
            contentType,
            upsert: true,
          })
          if (retryErr) return { error: retryErr.message }
        } else {
          return { error: createErr.message }
        }
      } else {
        return { error: uploadError.message }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "アップロードに失敗しました"
    return { error: msg }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { publicUrl: data.publicUrl }
}
