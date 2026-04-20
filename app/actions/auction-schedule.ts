"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type AuctionScheduleEntry = {
  date: string // YYYY-MM-DD
  dayOfWeek: string
  region: string
  auctionType: string | null
  lotCount: number
  soldCount: number
  avgSoldPrice: number | null
}

/**
 * 過去のauction_dateから次回のBDS開催日を予測
 * パターン: 各会場（関西/関東/九州）の開催曜日パターンから推定
 */
export async function getUpcomingAuctionSchedule(): Promise<{
  success: boolean
  past: AuctionScheduleEntry[]
  upcoming: Array<{ date: string; dayOfWeek: string; region: string; note: string }>
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("auction_history")
      .select("auction_date, region, auction_type, sold_price, result_status")
      .not("auction_date", "is", null)
      .gte("auction_date", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .limit(5000)
    if (error) throw error

    const byDateRegion = new Map<
      string,
      { region: string; auctionType: string | null; lots: Array<{ sold: boolean; price: number | null }> }
    >()
    for (const r of data ?? []) {
      if (!r.auction_date) continue
      const key = `${r.auction_date}__${r.region ?? ""}`
      if (!byDateRegion.has(key)) {
        byDateRegion.set(key, {
          region: r.region ?? "",
          auctionType: r.auction_type,
          lots: [],
        })
      }
      const g = byDateRegion.get(key)!
      g.lots.push({
        sold: r.result_status === "sold",
        price: r.sold_price,
      })
    }

    const past: AuctionScheduleEntry[] = Array.from(byDateRegion.entries())
      .map(([key, v]) => {
        const [date] = key.split("__")
        const d = new Date(date)
        const days = ["日", "月", "火", "水", "木", "金", "土"]
        const soldPrices = v.lots.filter((l) => l.sold && l.price).map((l) => l.price as number)
        const avg = soldPrices.length > 0 ? soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length : null
        return {
          date,
          dayOfWeek: days[d.getDay()],
          region: v.region,
          auctionType: v.auctionType,
          lotCount: v.lots.length,
          soldCount: v.lots.filter((l) => l.sold).length,
          avgSoldPrice: avg,
        }
      })
      .sort((a, b) => (a.date > b.date ? -1 : 1))

    // 各region別に最後の開催日と曜日パターンを取得
    const regionPatterns = new Map<string, { lastDate: string; dayOfWeek: number }>()
    for (const p of past) {
      if (!p.region) continue
      if (!regionPatterns.has(p.region)) {
        const d = new Date(p.date)
        regionPatterns.set(p.region, { lastDate: p.date, dayOfWeek: d.getDay() })
      }
    }

    // 各regionの次の同曜日を予測（簡易）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const upcoming: Array<{ date: string; dayOfWeek: string; region: string; note: string }> = []
    const days = ["日", "月", "火", "水", "木", "金", "土"]
    for (const [region, pat] of regionPatterns.entries()) {
      // 次のその曜日を3回分予測
      const last = new Date(pat.lastDate)
      for (let i = 1; i <= 4; i++) {
        const next = new Date(last)
        next.setDate(last.getDate() + 7 * i)
        if (next < today) continue
        upcoming.push({
          date: next.toISOString().slice(0, 10),
          dayOfWeek: days[next.getDay()],
          region,
          note: `前回の${days[pat.dayOfWeek]}曜パターンから予測`,
        })
      }
    }
    upcoming.sort((a, b) => (a.date < b.date ? -1 : 1))

    return { success: true, past: past.slice(0, 30), upcoming: upcoming.slice(0, 8) }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得失敗"
    return { success: false, past: [], upcoming: [], error: message }
  }
}
