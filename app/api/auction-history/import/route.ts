import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

type RecordInput = {
  bds_lot_number?: string | null
  auction_date?: string | null
  sold_price?: number | null
  result_status?: string | null
  [key: string]: unknown
}

/**
 * /auction-history 画面（BDS取込タブ）から records配列 を受けて一括取込
 * 重複判定: (bds_lot_number, auction_date) で検索→分岐
 * - 新規 → INSERT
 * - 既存かつ sold_price 未設定 → UPDATE
 * - 既存かつ sold_price 設定済み → SKIP
 */
export async function POST(req: NextRequest) {
  try {
    const { records } = (await req.json()) as { records: RecordInput[] }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: "records は空でない配列で指定してください" },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    let inserted = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (const rec of records) {
      const lot = rec.bds_lot_number
      const date = rec.auction_date
      const region = (rec.region as string | null) ?? null
      if (!lot || !date) {
        skipped++
        continue
      }
      try {
        let query = supabase
          .from("auction_history")
          .select("id, sold_price")
          .eq("bds_lot_number", lot)
          .eq("auction_date", date)
        if (region) query = query.eq("region", region)
        else query = query.is("region", null)
        const { data: existing } = await query.limit(1).maybeSingle()

        if (!existing) {
          const { error } = await supabase.from("auction_history").insert(rec)
          if (error) {
            errors.push(`${lot}: ${error.message}`)
            skipped++
          } else {
            inserted++
          }
        } else if (existing.sold_price == null && rec.sold_price != null) {
          const { error } = await supabase
            .from("auction_history")
            .update({
              sold_price: rec.sold_price,
              result_status: rec.result_status,
              start_price: rec.start_price,
              parts_included: rec.parts_included,
            })
            .eq("id", existing.id)
          if (error) {
            errors.push(`${lot}: update - ${error.message}`)
            skipped++
          } else {
            updated++
          }
        } else {
          skipped++
        }
      } catch (e) {
        errors.push(`${lot}: ${e instanceof Error ? e.message : String(e)}`)
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      skipped,
      total: records.length,
      errorSample: errors.slice(0, 3),
    })
  } catch (error) {
    console.error("BDS import error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "取込に失敗しました",
      },
      { status: 500 }
    )
  }
}
