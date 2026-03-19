"use client"

import { useState, useEffect } from "react"
import { getInventoryItems } from "@/app/actions/inventory"
import { getMarketPrices } from "@/app/actions/market-prices"
import type { InventoryItemRow } from "@/app/actions/inventory"
import type { MarketPrice } from "@/lib/types"
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

const YAHOO_FEE = 2680
const SHIPPING_AVG: Record<string, number> = {
  "～125cc": 13365,
  "126～750cc": 14025,
  "751～1200cc": 14685,
  "1201～1500cc": 15400,
  "1501cc以上": 16005,
}

const fmt = (n: number | null | undefined) =>
  n != null ? `¥${n.toLocaleString()}` : "—"

function matchMarket(
  item: InventoryItemRow,
  markets: MarketPrice[]
): MarketPrice | null {
  if (!item.maker && !item.model_name) return null
  return (
    markets.find(
      (m) =>
        (item.maker ? m.maker.includes(item.maker) || item.maker.includes(m.maker) : true) &&
        (item.model_name
          ? m.model.includes(item.model_name) || item.model_name.includes(m.model)
          : true)
    ) ?? null
  )
}

function estimateProfit(
  item: InventoryItemRow,
  market: MarketPrice | null
): { yahooPrice: number | null; shipping: number; bdsFee: number; netProfit: number | null } {
  const yahooPrice = market?.avg_price ?? null
  const ccRange = item.cc_range ?? "126～750cc"
  const shipping = SHIPPING_AVG[ccRange] ?? 14025
  const bdsFee = 5792 // roughly mid-range A member
  if (yahooPrice == null || item.purchase_price == null) {
    return { yahooPrice, shipping, bdsFee, netProfit: null }
  }
  const netProfit = yahooPrice - item.purchase_price - shipping - YAHOO_FEE - bdsFee
  return { yahooPrice, shipping, bdsFee, netProfit }
}

export function ProfitForecastContent() {
  const [items, setItems] = useState<InventoryItemRow[]>([])
  const [markets, setMarkets] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getInventoryItems(), getMarketPrices()]).then(([inv, mkt]) => {
      if (inv.success) {
        setItems((inv.items ?? []).filter((i) => i.status !== "売却済"))
      }
      if (mkt.success) setMarkets(mkt.rows ?? [])
      setLoading(false)
    })
  }, [])

  const rows = items.map((item) => {
    const market = matchMarket(item, markets)
    const profit = estimateProfit(item, market)
    return { item, market, ...profit }
  })

  const totalExpectedProfit = rows.reduce(
    (s, r) => s + (r.netProfit ?? 0),
    0
  )
  const matchedCount = rows.filter((r) => r.market != null).length

  if (loading) {
    return (
      <div style={pageWrapper}>
        <div style={{ color: C.textMuted, fontFamily: font, fontSize: 13 }}>読み込み中...</div>
      </div>
    )
  }

  return (
    <div style={pageWrapper}>
      <div style={pageTitle}>在庫×期待利益</div>
      <div style={pageSub}>現在庫の期待粗利一覧（相場価格から自動算出）</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
        <div style={kpiCard(C.green)}>
          <div style={lbl}>期待粗利合計</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: C.green }}>
            {fmt(totalExpectedProfit)}
          </div>
        </div>
        <div style={kpiCard(C.orange)}>
          <div style={lbl}>在庫台数</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: C.orange }}>
            {items.length} 台
          </div>
        </div>
        <div style={kpiCard(C.blue)}>
          <div style={lbl}>相場マッチ済</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: C.blue }}>
            {matchedCount} / {items.length} 台
          </div>
        </div>
      </div>

      <div style={card()}>
        <div
          style={{
            fontFamily: font,
            fontSize: 10,
            color: C.textMuted,
            marginBottom: 12,
            lineHeight: 1.7,
          }}
        >
          ※ 送料は会場平均値を使用（関東・九州の中間）。BDS手数料はA会員・中間帯を想定。相場は「市場価格」ページで登録したデータを参照します。
        </div>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>車両</th>
              <th style={th}>仕入れ</th>
              <th style={th}>相場（ヤフオク平均）</th>
              <th style={th}>送料+手数料</th>
              <th style={th}>期待粗利</th>
              <th style={th}>状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, market, yahooPrice, shipping, bdsFee, netProfit }) => {
              const name = [item.maker, item.model_name, item.model_type]
                .filter(Boolean)
                .join(" ") || "（未入力）"
              const costs = shipping + YAHOO_FEE + bdsFee

              return (
                <tr key={item.id}>
                  <td style={td}>
                    <div style={{ fontWeight: "bold" }}>{name}</div>
                    {market && (
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                        相場: {market.maker} {market.model}
                      </div>
                    )}
                    {!market && (
                      <div style={{ fontSize: 10, color: C.yellow, marginTop: 2 }}>
                        相場未登録
                      </div>
                    )}
                  </td>
                  <td style={td}>{fmt(item.purchase_price)}</td>
                  <td style={{ ...td, color: C.orange }}>
                    {yahooPrice != null ? fmt(yahooPrice) : (
                      <span style={{ color: C.textMuted }}>—</span>
                    )}
                    {market && (
                      <div style={{ fontSize: 10, color: C.textMuted }}>
                        {fmt(market.min_price)} 〜 {fmt(market.max_price)}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, color: C.textSub }}>{fmt(costs)}</td>
                  <td
                    style={{
                      ...td,
                      fontWeight: "bold",
                      color:
                        netProfit == null
                          ? C.textMuted
                          : netProfit >= 30000
                            ? C.green
                            : netProfit >= 0
                              ? C.yellow
                              : C.red,
                    }}
                  >
                    {netProfit != null
                      ? `${netProfit >= 0 ? "+" : ""}${fmt(netProfit)}`
                      : "—"}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        background: `${C.orange}18`,
                        color: C.orange,
                        border: `1px solid ${C.orange}30`,
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div style={{ color: C.textMuted, fontFamily: font, fontSize: 13, padding: "20px 0" }}>
            在庫データがありません。在庫管理ページから車両を登録してください。
          </div>
        )}
      </div>
    </div>
  )
}
