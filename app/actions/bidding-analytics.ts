"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type CategoryStats = {
  category: string
  count: number
  avgProfit: number
  avgDaysInStock: number
  totalProfit: number
}

export type VideoEffectStats = {
  withVideo: { count: number; avgSoldPrice: number; avgBidCount: number }
  withoutVideo: { count: number; avgSoldPrice: number; avgBidCount: number }
}

export type EndDayStats = {
  day: string
  count: number
  avgBidCount: number
  avgSoldPrice: number
}

export type AnalyticsResult = {
  success: boolean
  error?: string
  totalSold?: number
  totalProfit?: number
  avgProfit?: number
  avgDaysInStock?: number
  byCategory?: CategoryStats[]
  videoEffect?: VideoEffectStats
  byEndDay?: EndDayStats[]
  adEffect?: {
    avgWatchCount: number
    avgBidCount: number
    avgBidderCount: number
  }
}

const DAYS = ["月", "火", "水", "木", "金", "土", "日"] as const

export async function getBiddingAnalytics(): Promise<AnalyticsResult> {
  try {
    const supabase = createServerSupabaseClient()

    // 売却済みの在庫データ取得（evaluationsと結合して車種カテゴリを取得するため）
    const { data: items, error: iErr } = await supabase
      .from("inventory_items")
      .select("*")
      .not("sold_price", "is", null)
    if (iErr) throw iErr

    // 車種カテゴリは evaluations に入っているので、chassis_number で紐付けるか、
    // または inventory_items 側の category を使う
    // ここでは単純化のため inventory_items の category を使用
    const sold = (items ?? []) as Array<Record<string, unknown>>
    const totalSold = sold.length

    if (totalSold === 0) {
      return {
        success: true,
        totalSold: 0,
        totalProfit: 0,
        avgProfit: 0,
        avgDaysInStock: 0,
        byCategory: [],
        videoEffect: {
          withVideo: { count: 0, avgSoldPrice: 0, avgBidCount: 0 },
          withoutVideo: { count: 0, avgSoldPrice: 0, avgBidCount: 0 },
        },
        byEndDay: DAYS.map((d) => ({
          day: d,
          count: 0,
          avgBidCount: 0,
          avgSoldPrice: 0,
        })),
        adEffect: { avgWatchCount: 0, avgBidCount: 0, avgBidderCount: 0 },
      }
    }

    const num = (v: unknown): number => (typeof v === "number" ? v : 0)
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
    const avg = (arr: number[]) => (arr.length === 0 ? 0 : sum(arr) / arr.length)

    const totalProfit = sum(sold.map((r) => num(r.actual_profit)))
    const avgProfit = avg(sold.map((r) => num(r.actual_profit)))
    const avgDaysInStock = avg(
      sold
        .map((r) => num(r.days_in_stock))
        .filter((n) => n > 0)
    )

    // カテゴリ別集計
    const categoryMap = new Map<string, Array<Record<string, unknown>>>()
    for (const r of sold) {
      const cat = (r.category as string) ?? "未分類"
      if (!categoryMap.has(cat)) categoryMap.set(cat, [])
      categoryMap.get(cat)!.push(r)
    }
    const byCategory: CategoryStats[] = Array.from(categoryMap.entries())
      .map(([category, rows]) => ({
        category,
        count: rows.length,
        avgProfit: avg(rows.map((r) => num(r.actual_profit))),
        avgDaysInStock: avg(
          rows.map((r) => num(r.days_in_stock)).filter((n) => n > 0)
        ),
        totalProfit: sum(rows.map((r) => num(r.actual_profit))),
      }))
      .sort((a, b) => b.count - a.count)

    // 動画効果
    const withVideo = sold.filter((r) => r.has_video === true)
    const withoutVideo = sold.filter((r) => r.has_video !== true)
    const videoEffect: VideoEffectStats = {
      withVideo: {
        count: withVideo.length,
        avgSoldPrice: avg(withVideo.map((r) => num(r.sold_price))),
        avgBidCount: avg(withVideo.map((r) => num(r.bid_count))),
      },
      withoutVideo: {
        count: withoutVideo.length,
        avgSoldPrice: avg(withoutVideo.map((r) => num(r.sold_price))),
        avgBidCount: avg(withoutVideo.map((r) => num(r.bid_count))),
      },
    }

    // 終了曜日別
    const byEndDay: EndDayStats[] = DAYS.map((day) => {
      const rows = sold.filter((r) => r.listing_end_day === day)
      return {
        day,
        count: rows.length,
        avgBidCount: avg(rows.map((r) => num(r.bid_count))),
        avgSoldPrice: avg(rows.map((r) => num(r.sold_price))),
      }
    })

    // 広告効果（全体平均）
    const adEffect = {
      avgWatchCount: avg(sold.map((r) => num(r.watch_count))),
      avgBidCount: avg(sold.map((r) => num(r.bid_count))),
      avgBidderCount: avg(sold.map((r) => num(r.bidder_count))),
    }

    return {
      success: true,
      totalSold,
      totalProfit,
      avgProfit,
      avgDaysInStock,
      byCategory,
      videoEffect,
      byEndDay,
      adEffect,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "分析に失敗しました"
    return { success: false, error: message }
  }
}
