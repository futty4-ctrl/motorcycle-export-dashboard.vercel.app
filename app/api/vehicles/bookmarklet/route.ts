import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { fetchAndUploadVehicleImage } from "@/lib/supabase/upload-vehicle-image"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-GAMI-API-KEY",
  "Access-Control-Max-Age": "86400",
}

const DEFAULT_API_KEY = "gami-bk-7f3a9c2e1b8d4f6a0e5c9b3d7f1a8e2c"

type BookmarkletBody = {
  vehicleName?: string | null
  lotNumber?: string | null
  overallGrade?: string | null
  imageUrl?: string | null
  price?: number | null
  url?: string | null
  grade?: string | null
  image_url?: string | null
  車名?: string | null
  車種名?: string | null
  出品番号?: string | null
  評価点?: string | null
  総合評価点?: string | null
  価格?: number | null
  URL?: string | null
  画像URL?: string | null
  メイン写真URL?: string | null
  [key: string]: unknown
}

function str(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

function num(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

/** GET: ブックマークレットAPIの疎通確認用 */
export async function GET() {
  return NextResponse.json(
    { ok: true, message: "Bookmarklet API は稼働中。POST で車両登録してください。" },
    { status: 200, headers: corsHeaders }
  )
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("X-GAMI-API-KEY")?.trim()
    const expected = process.env.GAMI_BOOKMARKLET_API_KEY?.trim() || DEFAULT_API_KEY
    if (apiKey !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
    }

    let body: BookmarkletBody
    try {
      body = (await req.json()) as BookmarkletBody
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: corsHeaders }
      )
    }

    const vehicleName = str(body?.vehicleName ?? body?.車名 ?? body?.車種名)
    const lotNumber = str(body?.lotNumber ?? body?.出品番号)
    const overallGrade = str(
      body?.overallGrade ?? body?.grade ?? body?.総合評価点 ?? body?.評価点
    )
    const imageUrl = str(
      body?.imageUrl ??
        body?.image_url ??
        body?.画像URL ??
        body?.メイン写真URL
    )
    const price = num(body?.price ?? body?.価格)
    const url = str(body?.url ?? body?.URL)

    if (!vehicleName && !lotNumber && !url) {
      return NextResponse.json(
        { error: "At least one of vehicleName, lotNumber, or url is required" },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createServerSupabaseClient()
    const status = "仕入中"
    const chassisNumber = vehicleName || lotNumber || null

    let existingId: string | null = null
    if (url || lotNumber) {
      if (url) {
        const { data: byUrl } = await supabase
          .from("vehicles")
          .select("id")
          .eq("source_url", url)
          .maybeSingle()
        if (byUrl?.id) existingId = byUrl.id
      }
      if (!existingId && lotNumber) {
        const { data: byLot } = await supabase
          .from("vehicles")
          .select("id")
          .eq("lot_number", lotNumber)
          .maybeSingle()
        if (byLot?.id) existingId = byLot.id
      }
    }

    if (existingId) {
      let finalImageUrl: string | null = null
      if (imageUrl) {
        const uploaded = await fetchAndUploadVehicleImage(imageUrl, existingId)
        if ("publicUrl" in uploaded) finalImageUrl = uploaded.publicUrl
      }
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({
          status,
          ...(chassisNumber != null && { chassis_number: chassisNumber }),
          ...(overallGrade != null && { bds_rating: overallGrade }),
          ...(lotNumber != null && { lot_number: lotNumber }),
          ...(url != null && { source_url: url }),
          ...(finalImageUrl != null && { image_url: finalImageUrl }),
        })
        .eq("id", existingId)
      if (updateError) throw updateError
      if (price != null && price > 0) {
        const { data: sc } = await supabase
          .from("scenarios")
          .select("id")
          .eq("vehicle_id", existingId)
          .eq("scenario_type", "bookmarklet")
          .maybeSingle()
        const details = { url: url ?? null, lotNumber: lotNumber ?? null, source: "bookmarklet" }
        if (sc?.id) {
          await supabase.from("scenarios").update({ profit: price, details }).eq("id", sc.id)
        } else {
          await supabase.from("scenarios").insert({
            vehicle_id: existingId,
            scenario_type: "bookmarklet",
            profit: price,
            details,
          })
        }
      }
      return NextResponse.json(
        { success: true, vehicleId: existingId, action: "updated" },
        { status: 200, headers: corsHeaders }
      )
    }

    const { data: inserted, error: insertError } = await supabase
      .from("vehicles")
      .insert({
        status,
        chassis_number: chassisNumber,
        bds_rating: overallGrade ?? null,
        lot_number: lotNumber ?? null,
        source_url: url ?? null,
      })
      .select("id")
      .single()

    if (insertError) throw insertError
    const vehicleId = inserted?.id
    if (!vehicleId) throw new Error("Insert did not return id")

    if (imageUrl) {
      const uploaded = await fetchAndUploadVehicleImage(imageUrl, vehicleId)
      if ("publicUrl" in uploaded) {
        await supabase.from("vehicles").update({ image_url: uploaded.publicUrl }).eq("id", vehicleId)
      }
    }

    if (price != null && price > 0) {
      await supabase.from("scenarios").insert({
        vehicle_id: vehicleId,
        scenario_type: "bookmarklet",
        profit: price,
        details: { url: url ?? null, lotNumber: lotNumber ?? null, source: "bookmarklet" },
      })
    }

    return NextResponse.json(
      { success: true, vehicleId, action: "created" },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error("[bookmarklet]", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}
