"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

export type BiddingSummary = {
  unjudged: number // 判定未入力の評価数
  weekGo: number
  weekNoGo: number
  weekSkip: number
  weekTotal: number
  monthSoldCount: number
  monthProfit: number
}

/**
 * ダッシュボード用の入札判断サマリー（今週の判定数、未判定、今月の実利益）
 */
export async function getBiddingSummary(): Promise<{
  success: boolean
  error?: string
  summary?: BiddingSummary
}> {
  try {
    const supabase = createServerSupabaseClient()

    // 今週（月曜起算）の開始日
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=日, 1=月...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - mondayOffset)
    weekStart.setHours(0, 0, 0, 0)

    // 今月の開始日
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // 評価を取得（全件 - 件数が少ないので問題なし）
    const { data: evals, error: eErr } = await supabase
      .from("evaluations")
      .select("bid_decision, created_at")
    if (eErr) throw eErr

    const evaluations = (evals ?? []) as Array<{
      bid_decision: string | null
      created_at: string
    }>

    const unjudged = evaluations.filter((e) => !e.bid_decision).length
    const weekEvals = evaluations.filter(
      (e) => new Date(e.created_at) >= weekStart
    )
    const weekGo = weekEvals.filter((e) => e.bid_decision === "GO").length
    const weekNoGo = weekEvals.filter((e) => e.bid_decision === "NO GO").length
    const weekSkip = weekEvals.filter((e) => e.bid_decision === "見送り").length
    const weekTotal = weekEvals.length

    // 今月の売却実績
    const { data: items, error: iErr } = await supabase
      .from("inventory_items")
      .select("sold_date, actual_profit")
      .not("sold_date", "is", null)
      .gte("sold_date", monthStart.toISOString().slice(0, 10))
    if (iErr) throw iErr

    const soldItems = (items ?? []) as Array<{
      sold_date: string | null
      actual_profit: number | null
    }>
    const monthSoldCount = soldItems.length
    const monthProfit = soldItems.reduce(
      (sum, r) => sum + (typeof r.actual_profit === "number" ? r.actual_profit : 0),
      0
    )

    return {
      success: true,
      summary: {
        unjudged,
        weekGo,
        weekNoGo,
        weekSkip,
        weekTotal,
        monthSoldCount,
        monthProfit: Math.round(monthProfit),
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, error: message }
  }
}
