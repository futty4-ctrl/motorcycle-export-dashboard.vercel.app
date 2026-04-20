"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  AuctionHistoryRecord,
  AuctionHistoryFilter,
  AuctionHistorySummary,
} from "@/types/auction-history"

function normalizeRow(row: Record<string, unknown>): AuctionHistoryRecord {
  const photoUrls = row.photo_urls
  let photos: string[] = []
  if (Array.isArray(photoUrls)) {
    photos = photoUrls.filter((v): v is string => typeof v === "string")
  } else if (typeof photoUrls === "string") {
    try {
      const parsed = JSON.parse(photoUrls)
      if (Array.isArray(parsed)) {
        photos = parsed.filter((v): v is string => typeof v === "string")
      }
    } catch {
      photos = []
    }
  }
  return {
    ...(row as unknown as AuctionHistoryRecord),
    photo_urls: photos,
    notes: (row.notes as string) ?? "",
  }
}

export async function getAuctionHistory(
  filter: AuctionHistoryFilter = {}
): Promise<{
  success: boolean
  rows?: AuctionHistoryRecord[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    let q = supabase.from("auction_history").select("*")

    if (filter.recordType && filter.recordType !== "all") {
      q = q.eq("record_type", filter.recordType)
    }
    if (filter.resultStatus && filter.resultStatus !== "all") {
      q = q.eq("result_status", filter.resultStatus)
    }
    if (filter.auctionTypeKind && filter.auctionTypeKind !== "all") {
      q = q.eq("auction_type", filter.auctionTypeKind)
    }
    if (filter.region && filter.region !== "all") {
      q = q.eq("region", filter.region)
    }
    if (filter.source && filter.source !== "all") {
      q = q.eq("source", filter.source)
    }
    if (filter.ccRange && filter.ccRange !== "all") {
      if (filter.ccRange === "small") q = q.lte("displacement_cc", 125)
      else if (filter.ccRange === "mid")
        q = q.gt("displacement_cc", 125).lte("displacement_cc", 400)
      else if (filter.ccRange === "large") q = q.gt("displacement_cc", 400)
    }
    if (filter.dateFrom) {
      q = q.gte("auction_date", filter.dateFrom)
    }
    if (filter.dateTo) {
      q = q.lte("auction_date", filter.dateTo)
    }
    if (filter.search) {
      q = q.ilike("model_name", `%${filter.search}%`)
    }

    // フィルタが使われていればlimit緩和、なければデフォルト100件（直近のみ）
    const hasFilter =
      (filter.search && filter.search.trim().length > 0) ||
      (filter.recordType && filter.recordType !== "all") ||
      (filter.resultStatus && filter.resultStatus !== "all") ||
      (filter.auctionTypeKind && filter.auctionTypeKind !== "all") ||
      (filter.region && filter.region !== "all") ||
      (filter.source && filter.source !== "all") ||
      (filter.ccRange && filter.ccRange !== "all") ||
      filter.dateFrom ||
      filter.dateTo
    const rowLimit = hasFilter ? 50000 : 100

    const { data, error } = await q
      .order("auction_date", { ascending: false, nullsFirst: false })
      .limit(rowLimit)
    if (error) throw error
    const rows = (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>))
    return { success: true, rows }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "オークション履歴の取得に失敗しました"
    return { success: false, error: msg }
  }
}

export async function getAuctionHistorySummary(): Promise<{
  success: boolean
  summary?: AuctionHistorySummary
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("auction_history")
      .select("result_status,sold_price,auction_date")
    if (error) throw error

    const rows = data ?? []
    const total = rows.length
    const now = new Date()
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const thisMonth = rows.filter((r) => {
      const d = r.auction_date as string | null
      return d && d.startsWith(thisMonthKey)
    }).length

    const soldRows = rows.filter((r) => r.result_status === "sold")
    const soldRate = total > 0 ? soldRows.length / total : 0
    const soldWithPrice = soldRows.filter(
      (r) => typeof r.sold_price === "number" && r.sold_price! > 0
    ) as { sold_price: number }[]
    const avgSoldPrice =
      soldWithPrice.length > 0
        ? Math.round(
            soldWithPrice.reduce((s, r) => s + r.sold_price, 0) /
              soldWithPrice.length
          )
        : 0

    return {
      success: true,
      summary: { total, thisMonth, soldRate, avgSoldPrice },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "サマリー取得に失敗しました"
    return { success: false, error: msg }
  }
}

export async function updateAuctionRecord(
  id: string,
  patch: Partial<
    Pick<AuctionHistoryRecord, "notes" | "my_bid_price" | "bid_result">
  >
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from("auction_history")
      .update(patch)
      .eq("id", id)
    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "更新に失敗しました"
    return { success: false, error: msg }
  }
}

export async function getDistinctRegions(): Promise<{
  success: boolean
  regions?: string[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("auction_history")
      .select("region")
      .not("region", "is", null)
    if (error) throw error
    const set = new Set<string>()
    for (const row of data ?? []) {
      const r = (row as { region: string | null }).region
      if (r) set.add(r)
    }
    return { success: true, regions: Array.from(set).sort() }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "地域取得に失敗しました"
    return { success: false, error: msg }
  }
}
