import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { records } = await req.json()

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: "records は空でない配列で指定してください" },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    let inserted = 0
    let skipped = 0

    // バッチで upsert（bds_lot_number で重複判定）
    // Supabase の upsert は onConflict で処理
    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50)

      const { data, error } = await supabase
        .from("auction_history")
        .upsert(batch, {
          onConflict: "bds_lot_number",
          ignoreDuplicates: true,
        })
        .select("id")

      if (error) {
        console.error("auction_history upsert error:", error.message)
        // 個別挿入にフォールバック
        for (const record of batch) {
          const { error: singleError } = await supabase
            .from("auction_history")
            .upsert(record, {
              onConflict: "bds_lot_number",
              ignoreDuplicates: true,
            })
          if (singleError) {
            console.warn("skip row:", singleError.message)
            skipped++
          } else {
            inserted++
          }
        }
      } else {
        inserted += data?.length ?? batch.length
      }
    }

    skipped = records.length - inserted

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      total: records.length,
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
