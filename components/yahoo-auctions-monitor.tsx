"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Loader2, Gavel, Clock } from "lucide-react"
import { getYahooAuctionsListings } from "@/app/actions/yahoo-auctions"
import type { YahooAuctionItem } from "@/lib/yahoo-auctions-scraper"

function AuctionCard({ item }: { item: YahooAuctionItem }) {
  const hasBids = item.bidCount > 0
  return (
    <a
      href={item.itemUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-lg border transition-colors hover:border-primary/50 hover:bg-muted/30 ${
        hasBids
          ? "border-amber-500/50 bg-amber-500/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex gap-2 p-2">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-muted">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-medium text-foreground">
            {item.title}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {item.price}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {item.bidCount > 0 && (
              <span className="inline-flex items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400">
                <Gavel className="h-3 w-3" />
                {item.bidCount}入札
              </span>
            )}
            {item.timeLeft && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {item.timeLeft}
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </a>
  )
}

export function YahooAuctionsMonitor() {
  const [result, setResult] = useState<{
    success: boolean
    items?: YahooAuctionItem[]
    fetchedAt?: string
    error?: string
    fromCache?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getYahooAuctionsListings().then((r) => {
      if (!cancelled) {
        setResult(r)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <aside className="hidden w-72 shrink-0 border-l border-border bg-muted/20 xl:block">
        <div className="sticky top-0 flex h-full flex-col p-3">
          <h2 className="text-sm font-semibold text-foreground">ヤフオク出品中</h2>
          <div className="mt-3 flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </aside>
    )
  }

  if (!result?.success || result.error) {
    return (
      <aside className="hidden w-72 shrink-0 border-l border-border bg-muted/20 xl:block">
        <div className="sticky top-0 flex h-full flex-col p-3">
          <h2 className="text-sm font-semibold text-foreground">ヤフオク出品中</h2>
          <p className="mt-3 text-xs text-muted-foreground">
            {result?.error ?? "取得できませんでした"}
          </p>
        </div>
      </aside>
    )
  }

  const items = result.items ?? []

  return (
    <aside className="hidden w-72 shrink-0 border-l border-border bg-muted/20 xl:block">
      <div className="sticky top-0 flex h-full flex-col overflow-hidden">
        <div className="border-b border-border px-3 py-2">
          <h2 className="text-sm font-semibold text-foreground">ヤフオク出品中</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {items.length}件
            {result.fetchedAt && (
              <span className="ml-1">
                · {result.fromCache ? "キャッシュ" : "更新"} {new Date(result.fetchedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                出品中のアイテムはありません
              </p>
            ) : (
              items.map((item, i) => (
                <AuctionCard key={item.itemUrl + i} item={item} />
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
