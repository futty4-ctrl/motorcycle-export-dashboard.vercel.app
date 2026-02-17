import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const API_KEY_HEADER = "x-gami-api-key"

/** 検証するAPIキー（環境変数 GAMI_BOOKMARKLET_API_KEY で上書き可能） */
const DEFAULT_API_KEY = "gami-bk-7f3a9c2e1b8d4f6a0e5c9b3d7f1a8e2c"

/**
 * ブックマークレットから受け取るデータ
 * 必須: vehicleName / lotNumber / url のいずれか1つ以上
 * price は vehicles にはなく scenarios に保存
 */
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

// ========== CORS ==========

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-GAMI-API-KEY",
    "Access-Control-Max-Age": "86400",
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  const headers = corsHeaders(origin)
  const reqHeaders = request.headers.get("Access-Control-Request-Headers")
  if (reqHeaders) {
    headers["Access-Control-Allow-Headers"] = reqHeaders
  }
  return new NextResponse(null, { status: 204, headers })
}

// ========== APIキー検証 ==========

function checkApiKey(request: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const received = request.headers.get(API_KEY_HEADER)?.trim()
  const expected = process.env.GAMI_BOOKMARKLET_API_KEY?.trim() || DEFAULT_API_KEY
  const origin = request.headers.get("origin")
  const headers = corsHeaders(origin)

  if (!received || received !== expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid or missing X-GAMI-API-KEY" },
        { status: 401, headers }
      ),
    }
  }
  return { ok: true }
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

// ========== POST: 受信 → console.log → Supabase 保存 ==========

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  const headers = corsHeaders(origin)

  const auth = checkApiKey(request)
  if (!auth.ok) return auth.response

  let body: BookmarkletBody
  try {
    body = (await request.json()) as BookmarkletBody
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers }
    )
  }

  // 受け取る5項目: vehicleName, lotNumber, overallGrade, imageUrl, price（＋urlは重複検索用）
  const vehicleName = str(
    body?.vehicleName ?? body?.車名 ?? body?.車種名
  )
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

  console.log("[bookmarklet] received:", {
    vehicleName,
    lotNumber,
    overallGrade,
    imageUrl: imageUrl ? "(set)" : null,
    price,
    url: url ? "(set)" : null,
  })

  if (!vehicleName && !lotNumber && !url) {
    return NextResponse.json(
      { error: "At least one of vehicleName, lotNumber, or url is required" },
      { status: 400, headers }
    )
  }

  try {
    const supabase = createServerSupabaseClient()
    const status = "仕入中"
    // vehicles に保存: 車種名(chassis_number), 出品番号, 総合評価(bds_rating), 画像URL, 元URL
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
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({
          status,
          ...(chassisNumber != null && { chassis_number: chassisNumber }),
          ...(overallGrade != null && { bds_rating: overallGrade }),
          ...(lotNumber != null && { lot_number: lotNumber }),
          ...(url != null && { source_url: url }),
          ...(imageUrl != null && { image_url: imageUrl }),
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
        { status: 200, headers }
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
        image_url: imageUrl ?? null,
      })
      .select("id")
      .single()

    if (insertError) throw insertError
    const vehicleId = inserted?.id
    if (!vehicleId) throw new Error("Insert did not return id")

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
      { status: 200, headers }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bookmarklet save failed"
    console.error("[bookmarklet]", err)
    return NextResponse.json({ error: message }, { status: 500, headers })
  }
}
