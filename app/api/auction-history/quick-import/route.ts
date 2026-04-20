import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  parseBdsText,
  bdsRowToRecord,
  extractAuctionDateFromText,
} from "@/lib/bds-history-parser"

/**
 * ブックマークレット/外部ツールから生テキストで一括取込
 * POST body: { text: string, auction_date?: string (YYYY-MM-DD) }
 *
 * 重複判定: (bds_lot_number, auction_date) で一意
 * 既存レコードがあり、sold_price が未設定なら UPDATE（結果更新）
 * 既存レコードがあり、sold_price 設定済みなら SKIP
 */
export async function POST(req: NextRequest) {
  try {
    const { text, auction_date, source } = await req.json()
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "text が空です" },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 1. 明示指定 → それを使う
    // 2. 指定なし → テキストから自動抽出
    // 3. 抽出失敗 → 今日の日付
    const autoDetected = auction_date ? null : extractAuctionDateFromText(text)
    const date = auction_date || autoDetected || new Date().toISOString().slice(0, 10)
    const dateSource = auction_date
      ? "manual"
      : autoDetected
      ? "auto-detected"
      : "today-fallback"
    const parsed = parseBdsText(text)
    if (parsed.length === 0) {
      return NextResponse.json(
        {
          success: true,
          parsed: 0,
          inserted: 0,
          updated: 0,
          skipped: 0,
          sold: 0,
          unsold: 0,
          message: "BDS形式の落札行が見つかりませんでした",
        },
        { headers: corsHeaders() }
      )
    }

    const records = parsed.map((r) => bdsRowToRecord(r, date, source || "BDS"))
    const supabase = createServerSupabaseClient()
    let inserted = 0
    let updated = 0
    let skipped = 0
    const errorsDetail: string[] = []

    // 1件ずつ: (bds_lot_number, auction_date, region, source) で既存を検索→分岐
    for (const rec of records) {
      const lotNum = rec.bds_lot_number as string
      const region = (rec.region as string | null) ?? ""
      const recSource = (rec.source as string) || "BDS"
      try {
        let query = supabase
          .from("auction_history")
          .select("id, sold_price, result_status")
          .eq("bds_lot_number", lotNum)
          .eq("auction_date", date)
          .eq("source", recSource)
        if (region) query = query.eq("region", region)
        else query = query.is("region", null)
        const { data: existing } = await query.limit(1).maybeSingle()

        if (!existing) {
          // 新規
          const { error } = await supabase.from("auction_history").insert(rec)
          if (error) {
            errorsDetail.push(`${lotNum}: insert失敗 - ${error.message}`)
            skipped++
          } else {
            inserted++
          }
        } else if (existing.sold_price == null && rec.sold_price != null) {
          // 既存だが結果未確定→結果で更新
          const { error } = await supabase
            .from("auction_history")
            .update({
              sold_price: rec.sold_price,
              result_status: rec.result_status,
              parts_included: rec.parts_included,
              start_price: rec.start_price,
            })
            .eq("id", existing.id)
          if (error) {
            errorsDetail.push(`${lotNum}: update失敗 - ${error.message}`)
            skipped++
          } else {
            updated++
          }
        } else {
          skipped++
        }
      } catch (e) {
        errorsDetail.push(`${lotNum}: 例外 - ${e instanceof Error ? e.message : String(e)}`)
        skipped++
      }
    }

    return NextResponse.json(
      {
        success: true,
        parsed: parsed.length,
        inserted,
        updated,
        skipped,
        sold: parsed.filter((r) => r.result_status === "sold").length,
        unsold: parsed.filter((r) => r.result_status === "unsold").length,
        auction_date: date,
        date_source: dateSource,
        errorSample: errorsDetail.slice(0, 3),
      },
      { headers: corsHeaders() }
    )
  } catch (err) {
    console.error("quick-import error:", err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "取込失敗",
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 3) : null,
      },
      { status: 500, headers: corsHeaders() }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  })
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-auction-api-key",
  }
}
