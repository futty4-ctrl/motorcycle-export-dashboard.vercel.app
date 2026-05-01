import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("parts_research_log")
      .select("*")
      .order("searched_at", { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "取得失敗"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const insertData: Record<string, unknown> = {
      bds_url: body.bds_url ?? null,
      bds_lot_no: body.bds_lot_no ?? null,
      maker: body.maker,
      product_name: body.product_name,
      search_keyword: body.search_keyword,
      bds_start_price: body.bds_start_price ?? null,
      bds_won_price: body.bds_won_price ?? null,
      yahoo_median_price: body.yahoo_median_price ?? null,
      yahoo_listing_count: body.yahoo_listing_count ?? null,
      decision: body.decision ?? null,
      bid_limit: body.bid_limit ?? null,
      notes: body.notes ?? null,
      created_by: user?.id ?? null,
    }

    if (!insertData.maker || !insertData.product_name || !insertData.search_keyword) {
      return NextResponse.json(
        { error: "maker, product_name, search_keyword は必須" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("parts_research_log")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "保存失敗"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
