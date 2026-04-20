import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { parseBdsText, bdsRowToRecord } from "@/lib/bds-history-parser"

/**
 * ブックマークレット/外部ツールから生テキストで一括取込
 * POST body: { text: string, auction_date?: string (YYYY-MM-DD) }
 */
export async function POST(req: NextRequest) {
  try {
    const { text, auction_date } = await req.json()
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "text が空です" },
        { status: 400 }
      )
    }

    const date = auction_date || new Date().toISOString().slice(0, 10)
    const parsed = parseBdsText(text)
    if (parsed.length === 0) {
      return NextResponse.json({
        success: true,
        inserted: 0,
        skipped: 0,
        message: "BDS形式の落札行が見つかりませんでした",
      })
    }

    const records = parsed.map((r) => bdsRowToRecord(r, date))
    const supabase = createServerSupabaseClient()
    let inserted = 0
    let skipped = 0

    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50)
      const { data, error } = await supabase
        .from("auction_history")
        .upsert(batch, { onConflict: "bds_lot_number", ignoreDuplicates: true })
        .select("id")
      if (error) {
        for (const rec of batch) {
          const { error: e } = await supabase
            .from("auction_history")
            .upsert(rec, { onConflict: "bds_lot_number", ignoreDuplicates: true })
          if (e) skipped++
          else inserted++
        }
      } else {
        inserted += data?.length ?? 0
      }
    }
    skipped = records.length - inserted

    return NextResponse.json({
      success: true,
      parsed: parsed.length,
      inserted,
      skipped,
      sold: parsed.filter((r) => r.result_status === "sold").length,
      unsold: parsed.filter((r) => r.result_status === "unsold").length,
    })
  } catch (err) {
    console.error("quick-import error:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "取込失敗" },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
