"use client"

import { useState, useEffect } from "react"
import { getSoldItemsForMonth } from "@/app/actions/inventory"
import type { InventoryItemRow } from "@/app/actions/inventory"
import {
  C,
  font,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  kpiCard,
  lbl,
  table,
  th,
  td,
} from "@/components/ui-system"

const GOAL = 1_500_000

const fmt = (n: number | null | undefined) =>
  n != null ? `¥${n.toLocaleString()}` : "—"

export function MonthlyProgressContent() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [items, setItems] = useState<InventoryItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getSoldItemsForMonth(year, month).then((res) => {
      if (res.success) {
        setItems(res.items ?? [])
      } else {
        setError(res.error ?? "取得失敗")
      }
      setLoading(false)
    })
  }, [year, month])

  const totalSold = items.reduce((s, i) => s + (i.sold_price ?? 0), 0)
  const totalPurchase = items.reduce((s, i) => s + (i.purchase_price ?? 0), 0)
  const totalProfit = totalSold - totalPurchase
  const progress = Math.min((totalProfit / GOAL) * 100, 100)
  const remaining = Math.max(GOAL - totalProfit, 0)

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div style={pageWrapper}>
      <div style={pageTitle}>月次進捗トラッカー</div>
      <div style={pageSub}>粗利 ¥150万/月 達成状況（月50台目標）</div>

      {/* Month selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={prevMonth}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.textSub,
            padding: "6px 14px",
            cursor: "pointer",
            fontFamily: font,
            fontSize: 14,
          }}
        >
          ←
        </button>
        <div
          style={{
            fontFamily: font,
            fontSize: 18,
            fontWeight: "bold",
            color: C.text,
            minWidth: 120,
            textAlign: "center",
          }}
        >
          {year}/{String(month).padStart(2, "0")}
        </div>
        <button
          onClick={nextMonth}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.textSub,
            padding: "6px 14px",
            cursor: "pointer",
            fontFamily: font,
            fontSize: 14,
          }}
        >
          →
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
        <div style={kpiCard(C.green)}>
          <div style={lbl}>当月粗利</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: C.green }}>
            {fmt(totalProfit)}
          </div>
        </div>
        <div style={kpiCard(C.orange)}>
          <div style={lbl}>売上台数</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: C.orange }}>
            {items.length} 台
          </div>
        </div>
        <div style={kpiCard(C.blue)}>
          <div style={lbl}>目標残り</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: C.blue }}>
            {fmt(remaining)}
          </div>
        </div>
        <div style={kpiCard(C.textSub)}>
          <div style={lbl}>達成率</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: C.text }}>
            {progress.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ ...card(), marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: font, fontSize: 12, color: C.textSub }}>
            粗利進捗
          </div>
          <div style={{ fontFamily: font, fontSize: 12, color: C.textSub }}>
            目標: ¥1,500,000
          </div>
        </div>
        <div
          style={{
            height: 20,
            background: C.border,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background:
                progress >= 100
                  ? C.green
                  : progress >= 70
                    ? C.orange
                    : C.blue,
              borderRadius: 10,
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <div
          style={{
            fontFamily: font,
            fontSize: 11,
            color: C.textMuted,
            marginTop: 8,
            textAlign: "right",
          }}
        >
          {fmt(totalProfit)} / {fmt(GOAL)}
        </div>
      </div>

      {/* Sold items table */}
      <div style={card()}>
        <div style={{ fontFamily: font, fontSize: 13, color: C.textSub, marginBottom: 16 }}>
          売却済み車両 ({items.length} 台)
        </div>

        {loading ? (
          <div style={{ color: C.textMuted, fontFamily: font, fontSize: 13 }}>読み込み中...</div>
        ) : error ? (
          <div style={{ color: C.red, fontFamily: font, fontSize: 13 }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ color: C.textMuted, fontFamily: font, fontSize: 13 }}>
            この月の売却データはありません。<br />
            在庫管理から「売却済」ステータスに更新すると反映されます。
          </div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>売却日</th>
                <th style={th}>車両</th>
                <th style={th}>仕入れ</th>
                <th style={th}>売却額</th>
                <th style={th}>粗利</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const profit =
                  (item.sold_price ?? 0) - (item.purchase_price ?? 0)
                const name = [item.maker, item.model_name, item.model_type]
                  .filter(Boolean)
                  .join(" ") || "（未入力）"
                return (
                  <tr key={item.id}>
                    <td style={td}>{item.sold_date ?? "—"}</td>
                    <td style={td}>{name}</td>
                    <td style={td}>{fmt(item.purchase_price)}</td>
                    <td style={{ ...td, color: C.orange }}>{fmt(item.sold_price)}</td>
                    <td
                      style={{
                        ...td,
                        color: profit >= 0 ? C.green : C.red,
                        fontWeight: "bold",
                      }}
                    >
                      {profit >= 0 ? "+" : ""}
                      {fmt(profit)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Note about DB migration */}
      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          background: `${C.yellow}12`,
          border: `1px solid ${C.yellow}30`,
          borderRadius: 8,
          fontFamily: font,
          fontSize: 11,
          color: C.textMuted,
        }}
      >
        ⚠ 初回利用時はSupabaseで以下のSQLを実行してください:<br />
        <code style={{ color: C.yellow, display: "block", marginTop: 6 }}>
          ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sold_price bigint;
          ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sold_date date;
          ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cc_range text;
          ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS bds_venue text;
        </code>
      </div>
    </div>
  )
}
