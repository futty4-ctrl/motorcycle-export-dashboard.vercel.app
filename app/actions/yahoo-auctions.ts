"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  fetchSellerPageHtml,
  parseSellerPageHtml,
  CACHE_KEY,
  type YahooAuctionItem,
} from "@/lib/yahoo-auctions-scraper"

const CACHE_TTL_MINUTES = 20

/**
 * ヤフオク出品中一覧を取得。Supabase にキャッシュがあり 15〜30 分以内ならそれを返し、否则スクレイピングして保存する
 */
export async function getYahooAuctionsListings(): Promise<{
  success: boolean
  items?: YahooAuctionItem[]
  fetchedAt?: string
  error?: string
  fromCache?: boolean
}> {
  const sellerId = process.env.YAHOO_AUCTION_ID?.trim()
  if (!sellerId) {
    return {
      success: false,
      error: "YAHOO_AUCTION_ID が設定されていません。.env.local に出品者IDを設定してください。",
    }
  }

  try {
    const supabase = createServerSupabaseClient()
    const { data: row } = await supabase
      .from("yahoo_auctions_cache")
      .select("data, fetched_at")
      .eq("cache_key", CACHE_KEY)
      .eq("seller_id", sellerId)
      .single()

    const now = new Date()
    const fetchedAt = row?.fetched_at ? new Date(row.fetched_at) : null
    const isStale = !fetchedAt || (now.getTime() - fetchedAt.getTime()) / (60 * 1000) > CACHE_TTL_MINUTES

    if (row && !isStale && Array.isArray(row.data) && row.data.length >= 0) {
      return {
        success: true,
        items: row.data as YahooAuctionItem[],
        fetchedAt: row.fetched_at,
        fromCache: true,
      }
    }

    const html = await fetchSellerPageHtml(sellerId)
    const items = parseSellerPageHtml(html, sellerId)

    await supabase.from("yahoo_auctions_cache").upsert(
      {
        cache_key: CACHE_KEY,
        seller_id: sellerId,
        data: items,
        fetched_at: now.toISOString(),
      },
      { onConflict: "cache_key" }
    )

    return {
      success: true,
      items,
      fetchedAt: now.toISOString(),
      fromCache: false,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "ヤフオク一覧の取得に失敗しました"
    return { success: false, error: message }
  }
}
