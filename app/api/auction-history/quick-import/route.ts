import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  parseBdsText,
  bdsRowToRecord,
  extractAuctionDateFromText,
} from "@/lib/bds-history-parser"

/**
 * ブックマークレット/外部ツールから生テキストで一括取込（bulk最適化版）
 * POST body: { text: string, auction_date?: string (YYYY-MM-DD), source?: string }
 *
 * パフォーマンス改善：
 * - 事前に全既存レコードを1クエリで取得（lot#配列でfilter）
 * - toInsert / toUpdate に事前分類
 * - bulk insert / 既存更新のみ個別UPDATE（少数）
 */
export async function POST(req: NextRequest) {
  try {
    const { text, auction_date, source, force } = await req.json()
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "text が空です" },
        { status: 400, headers: corsHeaders() }
      )
    }

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
          auction_date: date,
          date_source: dateSource,
          message: "BDS形式の落札行が見つかりませんでした",
        },
        { headers: corsHeaders() }
      )
    }

    const records = parsed.map((r) => bdsRowToRecord(r, date, source || "BDS"))
    const supabase = createServerSupabaseClient()

    // force=true: 既存チェックをバイパス、DB側のUNIQUE制約だけで重複排除
    if (force) {
      let inserted = 0
      let skipped = 0
      const errorsDetail: string[] = []
      for (let i = 0; i < records.length; i += 100) {
        const batch = records.slice(i, i + 100)
        const { data, error } = await supabase
          .from("auction_history")
          .upsert(batch, {
            onConflict: "bds_lot_number,auction_date,region,source",
            ignoreDuplicates: true,
          })
          .select("id")
        if (error) {
          errorsDetail.push(`batch ${i}: ${error.message}`)
          skipped += batch.length
        } else {
          const actualInserted = data?.length ?? 0
          inserted += actualInserted
          skipped += batch.length - actualInserted
        }
      }
      return NextResponse.json(
        {
          success: true,
          mode: "force",
          parsed: parsed.length,
          inserted,
          updated: 0,
          skipped,
          sold: parsed.filter((r) => r.result_status === "sold").length,
          unsold: parsed.filter((r) => r.result_status === "unsold").length,
          auction_date: date,
          date_source: dateSource,
          errorSample: errorsDetail.slice(0, 3),
        },
        { headers: corsHeaders() }
      )
    }

    const lotNumbers = Array.from(
      new Set(records.map((r) => r.bds_lot_number as string).filter(Boolean))
    )

    // 既存レコードを一括取得（date + lot#で絞る、region/sourceはクライアント側で比較）
    const { data: existingRows, error: selErr } = await supabase
      .from("auction_history")
      .select("id, bds_lot_number, auction_date, region, source, sold_price")
      .in("bds_lot_number", lotNumbers)
      .eq("auction_date", date)
    if (selErr) {
      return NextResponse.json(
        {
          success: false,
          error: "既存チェック失敗: " + selErr.message,
        },
        { status: 500, headers: corsHeaders() }
      )
    }

    // 複合キー（lot#|date|region|source）でMap化
    const keyOf = (lot: unknown, d: unknown, r: unknown, s: unknown) =>
      `${lot ?? ""}|${d ?? ""}|${r ?? ""}|${s ?? "BDS"}`
    const existingMap = new Map<string, { id: string; sold_price: number | null }>()
    for (const e of existingRows ?? []) {
      existingMap.set(
        keyOf(e.bds_lot_number, e.auction_date, e.region, e.source),
        { id: e.id as string, sold_price: (e.sold_price ?? null) as number | null }
      )
    }

    // 新規 / 更新 / スキップ に分類
    const toInsert: typeof records = []
    const toUpdate: Array<{ id: string; patch: Record<string, unknown> }> = []
    let skipped = 0
    const skipSamples: Array<{ key: string; reason: string; newSoldPrice: unknown; oldSoldPrice: unknown }> = []

    for (const rec of records) {
      const k = keyOf(
        rec.bds_lot_number,
        rec.auction_date,
        rec.region,
        rec.source
      )
      const ex = existingMap.get(k)
      if (!ex) {
        toInsert.push(rec)
      } else if (ex.sold_price == null && rec.sold_price != null) {
        toUpdate.push({
          id: ex.id,
          patch: {
            sold_price: rec.sold_price,
            result_status: rec.result_status,
            start_price: rec.start_price,
            parts_included: rec.parts_included,
          },
        })
      } else {
        skipped++
        if (skipSamples.length < 5) {
          skipSamples.push({
            key: k,
            reason: ex.sold_price != null ? "already-has-sold-price" : "no-new-data",
            newSoldPrice: rec.sold_price,
            oldSoldPrice: ex.sold_price,
          })
        }
      }
    }

    // bulk insert（チャンクで安全に）
    let inserted = 0
    const errorsDetail: string[] = []
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100)
      const { error } = await supabase.from("auction_history").insert(batch)
      if (error) {
        errorsDetail.push(`insert batch ${i}: ${error.message}`)
        skipped += batch.length
      } else {
        inserted += batch.length
      }
    }

    // update は並列
    let updated = 0
    const updatePromises = toUpdate.map(async (u) => {
      const { error } = await supabase
        .from("auction_history")
        .update(u.patch)
        .eq("id", u.id)
      if (error) {
        errorsDetail.push(`update ${u.id}: ${error.message}`)
        return 0
      }
      return 1
    })
    const updateResults = await Promise.all(updatePromises)
    updated = updateResults.reduce((a, b) => a + b, 0)

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
        existingCount: existingRows?.length ?? 0,
        skipSamples,
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
