/**
 * riskAreas の fileId を画像表示用 URL に変換する。
 * - 既に URL（http 始まり）→ そのまま
 * - Supabase Storage パス形式（vehicleId/ファイル名）→ getPublicUrl
 * - それ以外（従来の Drive ID）→ Drive サムネURL（後方互換）
 */
export function getRiskAreaImageUrl(fileId: string): { src: string; href: string } {
  const trimmed = fileId?.trim()
  if (!trimmed) return { src: "", href: "" }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { src: trimmed, href: trimmed }
  }

  if (trimmed.includes("/")) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
    const path = trimmed
    const publicUrl = base
      ? `${base.replace(/\/$/, "")}/storage/v1/object/public/vehicle-images/${path}`
      : ""
    return { src: publicUrl, href: publicUrl }
  }

  const sz = "w400"
  return {
    src: `https://drive.google.com/thumbnail?id=${trimmed}&sz=${sz}`,
    href: `https://drive.google.com/file/d/${trimmed}/view`,
  }
}

/** ズーム表示用に高解像度の src を返す（Drive の場合は sz=w1200） */
export function getRiskAreaImageUrlLarge(fileId: string): string {
  const { src, href } = getRiskAreaImageUrl(fileId)
  if (src.includes("drive.google.com/thumbnail")) {
    return src.replace(/sz=w\d+/, "sz=w1200")
  }
  return src
}
