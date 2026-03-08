import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { analyzeRawPhotosForAppraisalWithResize } from "@/lib/ai/photo-appraiser"
import {
  getBdsPastAverageByModelName,
  getConditionCoefficient,
} from "@/lib/bds-past-average"

const MAX_IMAGES = 10
const MAX_BODY = 25 * 1024 * 1024 // 25MB
const ACCEPT_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/jpg"]

type ImageInput = { base64: string; mimeType: string }

async function normalizeFiles(files: File[]): Promise<ImageInput[]> {
  const list: ImageInput[] = []
  for (let i = 0; i < Math.min(files.length, MAX_IMAGES); i++) {
    const file = files[i]
    if (!file || file.size > MAX_BODY) continue
    const mime = (file.type || "").toLowerCase()
    if (!ACCEPT_IMAGE.includes(mime) && !mime.startsWith("image/")) continue
    const buf = Buffer.from(await file.arrayBuffer())
    list.push({
      base64: buf.toString("base64"),
      mimeType: mime || "image/jpeg",
    })
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
          { error: "画像を1枚以上送信してください。（image または file）" },
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
          { error: "JSON に imageBase64 または images 配列（最大10件）が必要です。" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Content-Type は multipart/form-data または application/json を指定してください。" },
        { status: 400 }
      )
    }

    const result = await analyzeRawPhotosForAppraisalWithResize(images)
    const coefficient = getConditionCoefficient(result.exteriorCondition)
    let pastAverageJpy = 0
    let pastSampleCount = 0
    if (result.modelName?.trim()) {
      const supabase = createServerSupabaseClient()
      const past = await getBdsPastAverageByModelName(supabase, result.modelName)
      pastAverageJpy = past.averagePriceJpy
      pastSampleCount = past.sampleCount
    }
    const SAFETY_MARGIN = 0.92
    const purchaseLimitJpy =
      pastAverageJpy > 0
        ? Math.round(pastAverageJpy * coefficient * SAFETY_MARGIN)
        : result.estimatedDomesticJpy > 0
          ? Math.round(result.estimatedDomesticJpy * coefficient * SAFETY_MARGIN)
          : 0

    return NextResponse.json({
      ...result,
      pastAverageJpy,
      pastSampleCount,
      purchaseLimitJpy,
      conditionCoefficient: coefficient,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI査定に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
