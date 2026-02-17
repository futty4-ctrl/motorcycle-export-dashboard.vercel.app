import { NextRequest, NextResponse } from "next/server"
import {
  resizeScreenshotForBds,
  resizeScreenshotForBdsMulti,
} from "@/lib/image-resize"
import { analyzeBdsScreenshotMultiple } from "@/lib/ai/bds-screenshot-analyzer"
import { pdfFirstPageToBase64 } from "@/lib/pdf-to-image"

const MAX_BODY = 25 * 1024 * 1024 // 25MB
const MAX_IMAGES = 3
const ACCEPT_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/jpg"]
const ACCEPT_PDF = "application/pdf"

type ImageInput = { base64: string; mimeType: string }

/** ファイルを1件受け取り、画像として base64 + mimeType に正規化する（PDF の場合は1ページ目を画像に変換） */
async function normalizeOneFile(file: File): Promise<ImageInput> {
  if (file.size > MAX_BODY) {
    throw new Error("ファイルサイズは 25MB 以下にしてください。")
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const mime = (file.type || "").toLowerCase()

  if (mime === ACCEPT_PDF) {
    const firstPage = await pdfFirstPageToBase64(buf)
    return { base64: firstPage.base64, mimeType: firstPage.mimeType }
  }
  if (ACCEPT_IMAGE.includes(mime) || mime.startsWith("image/")) {
    return {
      base64: buf.toString("base64"),
      mimeType: mime || "image/jpeg",
    }
  }
  throw new Error("画像（PNG/JPG/WebP）または PDF を指定してください。")
}

/** 複数ファイルを最大 MAX_IMAGES 件まで正規化（PDF は1ページ目を画像に） */
async function normalizeFiles(files: File[]): Promise<ImageInput[]> {
  const list: ImageInput[] = []
  for (let i = 0; i < Math.min(files.length, MAX_IMAGES); i++) {
    const file = files[i]
    if (!file) continue
    list.push(await normalizeOneFile(file))
  }
  return list
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? ""
    let images: ImageInput[] = []

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const imageFields = formData.getAll("image")
      const fileFields = formData.getAll("file")
      const files: File[] = []
      for (const f of [...imageFields, ...fileFields]) {
        if (f instanceof File) files.push(f)
      }
      if (files.length === 0) {
        return NextResponse.json(
          { error: "画像または PDF ファイル (image / file) を1枚以上送信してください。" },
          { status: 400 }
        )
      }
      images = await normalizeFiles(files)
    } else if (contentType.includes("application/json")) {
      const body = await request.json()
      const single = body?.imageBase64 ?? body?.base64
      if (typeof single === "string") {
        const mimeType = body?.mimeType ?? "image/jpeg"
        images = [{ base64: single, mimeType }]
      } else if (Array.isArray(body?.images)) {
        images = body.images
          .slice(0, MAX_IMAGES)
          .filter((x: unknown) => x && typeof (x as { base64?: string }).base64 === "string")
          .map((x: { base64: string; mimeType?: string }) => ({
            base64: x.base64,
            mimeType: x.mimeType ?? "image/jpeg",
          }))
      }
      if (images.length === 0) {
        return NextResponse.json(
          { error: "JSON に imageBase64 または images 配列（最大3件）が必要です。" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Content-Type は multipart/form-data または application/json を指定してください。" },
        { status: 400 }
      )
    }

    const optimized: ImageInput[] = []
    const resizeFn = images.length > 1 ? resizeScreenshotForBdsMulti : resizeScreenshotForBds
    for (const img of images) {
      const o = await resizeFn(img.base64, img.mimeType)
      optimized.push({ base64: o.base64, mimeType: o.mimeType })
    }

    const result = await analyzeBdsScreenshotMultiple(optimized)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "スクショ解析に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
