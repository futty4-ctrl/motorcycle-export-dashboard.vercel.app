import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.from("assessments").insert([
      {
        bike_name: body.bike_name ?? null,
        chassis_number: body.chassis_number ?? null,
        year: body.year ?? null,
        mileage: body.mileage ?? null,
        color: body.color ?? null,
        displacement: body.displacement ?? null,
        auction_price: body.auction_price ?? null,
        engine_status: body.engine_status ?? null,
        damage_summary: body.damage_summary ?? null,
        total_cost_min: body.total_cost_min ?? null,
        total_cost_max: body.total_cost_max ?? null,
        sell_price_min: body.sell_price_min ?? null,
        sell_price_max: body.sell_price_max ?? null,
        profit_min: body.profit_min ?? null,
        profit_max: body.profit_max ?? null,
        verdict: body.verdict ?? null,
        verdict_reason: body.verdict_reason ?? null,
        bid_limit: body.bid_limit ?? null,
        platform: "BDS",
        assessed_at: new Date().toISOString(),
      },
    ])

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存エラー" },
      { status: 500 }
    )
  }
}
