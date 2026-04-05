"use client"

import { useState, useEffect } from "react"
import {
  updateInventoryActuals,
  getInventoryActuals,
} from "@/app/actions/inventory-actuals"
import type { AuctionSource, ListingEndDay } from "@/lib/db/types"

const AUCTION_SOURCES: AuctionSource[] = [
  "BDS",
  "JBA",
  "OMC",
  "ヤフオク",
  "その他",
]
const END_DAYS: ListingEndDay[] = ["月", "火", "水", "木", "金", "土", "日"]

type Row = Record<string, unknown> | null

const numField = (v: unknown): string =>
  v == null || v === "" ? "" : String(v)
const boolField = (v: unknown): boolean => v === true || v === "true"

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `¥${Math.round(n).toLocaleString()}`

export default function InventoryActualsEditor({
  managementCode,
}: {
  managementCode: string
}) {
  const [loading, setLoading] = useState(true)
  const [row, setRow] = useState<Row>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 出品情報
  const [photoCount, setPhotoCount] = useState("")
  const [hasVideo, setHasVideo] = useState(false)
  const [adCost, setAdCost] = useState("700")
  const [startPrice, setStartPrice] = useState("1")
  const [endDay, setEndDay] = useState<ListingEndDay | "">("")
  const [endTime, setEndTime] = useState("")
  const [durationDays, setDurationDays] = useState("7")

  // 入札結果
  const [watchCount, setWatchCount] = useState("")
  const [bidCount, setBidCount] = useState("")
  const [bidderCount, setBidderCount] = useState("")

  // 仕入れ元・費用実績
  const [auctionSource, setAuctionSource] = useState<AuctionSource | "">("")
  const [transportActual, setTransportActual] = useState("")
  const [bdsFeeActual, setBdsFeeActual] = useState("")

  // 売却
  const [soldPrice, setSoldPrice] = useState("")
  const [soldDate, setSoldDate] = useState("")

  useEffect(() => {
    let cancelled = false
    getInventoryActuals(managementCode).then((res) => {
      if (cancelled) return
      if (res.success && res.data) {
        const r = res.data as Record<string, unknown>
        setRow(r)
        setPhotoCount(numField(r.photo_count))
        setHasVideo(boolField(r.has_video))
        setAdCost(numField(r.listing_ad_cost) || "700")
        setStartPrice(numField(r.listing_start_price) || "1")
        setEndDay((r.listing_end_day as ListingEndDay | null) ?? "")
        setEndTime(String(r.listing_end_time ?? ""))
        setDurationDays(numField(r.listing_duration_days) || "7")
        setWatchCount(numField(r.watch_count))
        setBidCount(numField(r.bid_count))
        setBidderCount(numField(r.bidder_count))
        setAuctionSource((r.auction_source as AuctionSource | null) ?? "")
        setTransportActual(numField(r.transport_cost_actual))
        setBdsFeeActual(numField(r.bds_fee_actual))
        setSoldPrice(numField(r.sold_price))
        setSoldDate(String(r.sold_date ?? "").slice(0, 10))
      } else if (!res.success) {
        setError(res.error ?? "取得に失敗しました")
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [managementCode])

  const handleSave = async () => {
    if (!row?.id) return
    setSaving(true)
    setError(null)
    const toNum = (v: string): number | null =>
      v === "" ? null : Number(v)
    const res = await updateInventoryActuals(row.id as string, {
      photo_count: toNum(photoCount),
      has_video: hasVideo,
      listing_ad_cost: toNum(adCost),
      listing_start_price: toNum(startPrice),
      listing_end_day: endDay || null,
      listing_end_time: endTime || null,
      listing_duration_days: toNum(durationDays),
      watch_count: toNum(watchCount),
      bid_count: toNum(bidCount),
      bidder_count: toNum(bidderCount),
      auction_source: auctionSource || null,
      transport_cost_actual: toNum(transportActual),
      bds_fee_actual: toNum(bdsFeeActual),
      sold_price: toNum(soldPrice),
      sold_date: soldDate || null,
    })
    if (res.success) {
      setSavedAt(new Date())
      // 再取得して自動算出されたactual_profitを反映
      const re = await getInventoryActuals(managementCode)
      if (re.success && re.data) setRow(re.data as Record<string, unknown>)
    } else {
      setError(res.error ?? "保存に失敗しました")
    }
    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>
  }

  if (!row) {
    return (
      <p className="text-sm text-destructive">
        {error ?? "在庫が見つかりません"}
      </p>
    )
  }

  const actualProfit = row.actual_profit as number | null
  const daysInStock = row.days_in_stock as number | null

  return (
    <div className="space-y-6">
      {/* 自動算出結果 */}
      {(actualProfit != null || daysInStock != null) && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
            自動算出結果
          </div>
          <div className="flex flex-wrap gap-6">
            {actualProfit != null && (
              <div>
                <div className="text-xs text-muted-foreground">実利益</div>
                <div
                  className={`text-2xl font-bold ${
                    actualProfit >= 0 ? "text-green-500" : "text-destructive"
                  }`}
                >
                  {fmt(actualProfit)}
                </div>
              </div>
            )}
            {daysInStock != null && (
              <div>
                <div className="text-xs text-muted-foreground">在庫日数</div>
                <div className="text-2xl font-bold">{daysInStock}日</div>
              </div>
            )}
          </div>
        </div>
      )}

      <Section title="出品情報">
        <Grid>
          <Field label="写真枚数">
            <Input
              type="number"
              value={photoCount}
              onChange={setPhotoCount}
            />
          </Field>
          <Field label="動画あり">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasVideo}
                onChange={(e) => setHasVideo(e.target.checked)}
                className="h-4 w-4"
              />
              YouTube動画あり
            </label>
          </Field>
          <Field label="開始価格（円）">
            <Input type="number" value={startPrice} onChange={setStartPrice} />
          </Field>
          <Field label="広告費（円）">
            <Input type="number" value={adCost} onChange={setAdCost} />
          </Field>
          <Field label="出品期間（日）">
            <Input
              type="number"
              value={durationDays}
              onChange={setDurationDays}
            />
          </Field>
          <Field label="終了曜日">
            <Select
              value={endDay}
              onChange={(v) => setEndDay(v as ListingEndDay | "")}
              options={["", ...END_DAYS]}
            />
          </Field>
          <Field label="終了時間">
            <Input
              type="text"
              value={endTime}
              onChange={setEndTime}
              placeholder="21:00"
            />
          </Field>
        </Grid>
      </Section>

      <Section title="入札結果">
        <Grid>
          <Field label="ウォッチ数">
            <Input type="number" value={watchCount} onChange={setWatchCount} />
          </Field>
          <Field label="入札数">
            <Input type="number" value={bidCount} onChange={setBidCount} />
          </Field>
          <Field label="入札者数（ユニーク）">
            <Input
              type="number"
              value={bidderCount}
              onChange={setBidderCount}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="仕入れ元・費用実績">
        <Grid>
          <Field label="仕入れ元">
            <Select
              value={auctionSource}
              onChange={(v) => setAuctionSource(v as AuctionSource | "")}
              options={["", ...AUCTION_SOURCES]}
            />
          </Field>
          <Field label="陸送費実績（円）">
            <Input
              type="number"
              value={transportActual}
              onChange={setTransportActual}
            />
          </Field>
          <Field label="BDS手数料実績（円）">
            <Input
              type="number"
              value={bdsFeeActual}
              onChange={setBdsFeeActual}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="売却">
        <Grid>
          <Field label="売却価格（円）">
            <Input type="number" value={soldPrice} onChange={setSoldPrice} />
          </Field>
          <Field label="売却日">
            <Input type="date" value={soldDate} onChange={setSoldDate} />
          </Field>
        </Grid>
      </Section>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 border-t pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
        {savedAt && (
          <span className="text-xs text-muted-foreground">
            {savedAt.toLocaleTimeString("ja-JP")} に保存しました
          </span>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Input({
  type,
  value,
  onChange,
  placeholder,
}: {
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
    />
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o || "— 選択 —"}
        </option>
      ))}
    </select>
  )
}
