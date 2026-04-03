"use client"

import { useState, useMemo } from "react"
import {
  C,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  lbl,
  inp,
} from "@/components/ui-system"

const fmt = (n: number) => `¥${Math.round(n).toLocaleString()}`
const fmtMan = (n: number) => {
  const man = n / 10000
  return man >= 100 ? `${Math.round(man)}万` : `${man.toFixed(1)}万`
}

type MonthData = {
  month: number
  purchases: number
  purchaseCost: number
  sales: number
  revenue: number
  profit: number
  cashStart: number
  cashEnd: number
  inventory: number
}

export function CashflowContent() {
  const [monthlyUnits, setMonthlyUnits] = useState(30)
  const [avgPurchase, setAvgPurchase] = useState(50000)
  const [avgProfit, setAvgProfit] = useState(50000)
  const [daysToSell, setDaysToSell] = useState(7)
  const [initialCash, setInitialCash] = useState(1500000)
  const [fixedCost, setFixedCost] = useState(100000)

  const data = useMemo(() => {
    const months: MonthData[] = []
    let cash = initialCash
    // Inventory carried over (units not yet sold from prior month)
    let inventoryUnits = 0

    for (let m = 1; m <= 12; m++) {
      const purchaseCount = monthlyUnits
      // How many of this month's purchases sell this month
      // daysToSell / 30 = fraction of month to sell
      const sellRatio = Math.min(1, (30 - daysToSell) / 30)
      const soldFromNew = Math.round(purchaseCount * sellRatio)
      // Also sell carried inventory
      const soldFromOld = inventoryUnits
      const totalSold = soldFromNew + soldFromOld

      const totalPurchaseCost = purchaseCount * avgPurchase
      const avgSellingPrice = avgPurchase + avgProfit
      const totalRevenue = totalSold * avgSellingPrice
      const totalProfit = totalSold * avgProfit - fixedCost

      const cashStart = cash
      cash = cash - totalPurchaseCost + totalRevenue - fixedCost
      const cashEnd = cash

      // Remaining unsold from this month
      inventoryUnits = purchaseCount - soldFromNew

      months.push({
        month: m,
        purchases: purchaseCount,
        purchaseCost: totalPurchaseCost,
        sales: totalSold,
        revenue: totalRevenue,
        profit: totalProfit,
        cashStart,
        cashEnd,
        inventory: inventoryUnits,
      })
    }
    return months
  }, [monthlyUnits, avgPurchase, avgProfit, daysToSell, initialCash, fixedCost])

  const maxCash = Math.max(...data.map((d) => d.cashEnd), initialCash)
  const minCash = Math.min(...data.map((d) => d.cashEnd), 0)
  const chartRange = maxCash - minCash || 1
  const dangerMonth = data.find((d) => d.cashEnd < 0)

  // Summary KPIs
  const yearProfit = data.reduce((s, d) => s + d.profit, 0)
  const yearRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const avgMonthlyCash = data.reduce((s, d) => s + d.cashEnd, 0) / 12
  const lowestCash = Math.min(...data.map((d) => d.cashEnd))

  // How many units can we do with initial cash
  const maxUnitsWithCash = Math.floor(initialCash / avgPurchase)

  // Target: 50 units — how much initial cash needed
  const neededFor50 = (() => {
    const target = 50
    const sellRatio = Math.min(1, (30 - daysToSell) / 30)
    const unsoldFirst = Math.round(target * (1 - sellRatio))
    // Need to fund: all purchases upfront, but get revenue from sold ones during month
    // Worst case: need to fund full month's purchases before any sales
    return target * avgPurchase + fixedCost
  })()

  return (
    <div style={pageWrapper}>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            ...pageTitle,
            background: `linear-gradient(135deg, ${C.text} 60%, ${C.green})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          資金繰りシミュレーター
        </div>
        <div style={pageSub}>
          月間仕入れ台数・利益・回転日数から12ヶ月のキャッシュフローを予測
        </div>
      </div>

      {/* Parameters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={card()}>
          <div style={lbl}>月間仕入れ台数</div>
          <input
            type="range"
            min={5}
            max={80}
            step={5}
            value={monthlyUnits}
            onChange={(e) => setMonthlyUnits(Number(e.target.value))}
            style={{ width: "100%", accentColor: C.orange, marginBottom: 8 }}
          />
          <div style={{ fontSize: 32, fontWeight: "bold", color: C.orange, textAlign: "center" }}>
            {monthlyUnits}<span style={{ fontSize: 14, color: C.textMuted }}>台/月</span>
          </div>
        </div>

        <div style={card()}>
          <div style={lbl}>平均仕入れ単価</div>
          <input
            type="range"
            min={10000}
            max={300000}
            step={5000}
            value={avgPurchase}
            onChange={(e) => setAvgPurchase(Number(e.target.value))}
            style={{ width: "100%", accentColor: C.orange, marginBottom: 8 }}
          />
          <div style={{ fontSize: 32, fontWeight: "bold", color: C.text, textAlign: "center" }}>
            {fmtMan(avgPurchase)}
          </div>
        </div>

        <div style={card()}>
          <div style={lbl}>平均粗利/台</div>
          <input
            type="range"
            min={10000}
            max={200000}
            step={5000}
            value={avgProfit}
            onChange={(e) => setAvgProfit(Number(e.target.value))}
            style={{ width: "100%", accentColor: C.green, marginBottom: 8 }}
          />
          <div style={{ fontSize: 32, fontWeight: "bold", color: C.green, textAlign: "center" }}>
            {fmtMan(avgProfit)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={card()}>
          <div style={lbl}>売れるまでの日数</div>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={daysToSell}
            onChange={(e) => setDaysToSell(Number(e.target.value))}
            style={{ width: "100%", accentColor: C.yellow, marginBottom: 8 }}
          />
          <div style={{ fontSize: 32, fontWeight: "bold", color: C.yellow, textAlign: "center" }}>
            {daysToSell}<span style={{ fontSize: 14, color: C.textMuted }}>日</span>
          </div>
        </div>

        <div style={card()}>
          <div style={lbl}>初期資金</div>
          <input
            style={inp}
            type="number"
            value={initialCash}
            onChange={(e) => setInitialCash(Number(e.target.value) || 0)}
          />
          <div style={{ fontSize: 18, fontWeight: "bold", color: C.text, textAlign: "center", marginTop: 8 }}>
            {fmtMan(initialCash)}
          </div>
        </div>

        <div style={card()}>
          <div style={lbl}>月間固定費（基地代等）</div>
          <input
            style={inp}
            type="number"
            value={fixedCost}
            onChange={(e) => setFixedCost(Number(e.target.value) || 0)}
          />
          <div style={{ fontSize: 18, fontWeight: "bold", color: C.textSub, textAlign: "center", marginTop: 8 }}>
            {fmtMan(fixedCost)}
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { label: "年間粗利", value: fmtMan(yearProfit), color: C.green },
          { label: "月平均粗利", value: fmtMan(yearProfit / 12), color: C.green },
          { label: "最低残高", value: fmtMan(lowestCash), color: lowestCash < 0 ? C.red : C.yellow },
          { label: "50台/月に必要な資金", value: fmtMan(neededFor50), color: C.blue },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card(), borderLeft: `3px solid ${color}`, textAlign: "center" }}>
            <div style={lbl}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: "bold", color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Danger warning */}
      {dangerMonth && (
        <div style={{
          ...card(),
          borderLeft: `4px solid ${C.red}`,
          background: C.redGlow,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: C.red, marginBottom: 4 }}>
            ⚠ 資金ショート警告
          </div>
          <div style={{ fontSize: 13, color: C.text }}>
            {dangerMonth.month}ヶ月目にキャッシュがマイナスになります（{fmt(dangerMonth.cashEnd)}）。
            初期資金を増やすか、仕入れ台数を減らしてください。
          </div>
        </div>
      )}

      {/* Cash flow chart */}
      <div style={card()}>
        <div style={lbl}>12ヶ月キャッシュフロー推移</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 220, marginTop: 16 }}>
          {data.map((d) => {
            const barHeight = Math.max(4, ((d.cashEnd - minCash) / chartRange) * 200)
            const isNegative = d.cashEnd < 0
            return (
              <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: "bold" }}>
                  {fmtMan(d.cashEnd)}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: barHeight,
                    background: isNegative
                      ? `linear-gradient(180deg, ${C.red}, ${C.red}60)`
                      : `linear-gradient(180deg, ${C.green}, ${C.green}60)`,
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s",
                  }}
                />
                <div style={{ fontSize: 10, color: C.textMuted }}>{d.month}月</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Monthly table */}
      <div style={{ ...card(), overflowX: "auto" }}>
        <div style={lbl}>月別詳細</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["月", "仕入", "仕入額", "販売", "売上", "粗利", "月初残高", "月末残高", "在庫"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "right",
                    padding: "8px 10px",
                    fontSize: 10,
                    color: C.textMuted,
                    borderBottom: `1px solid ${C.border}`,
                    letterSpacing: 1,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr
                key={d.month}
                style={{ transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={tdStyle}>{d.month}月</td>
                <td style={tdStyle}>{d.purchases}台</td>
                <td style={tdStyle}>{fmt(d.purchaseCost)}</td>
                <td style={tdStyle}>{d.sales}台</td>
                <td style={tdStyle}>{fmt(d.revenue)}</td>
                <td style={{ ...tdStyle, color: d.profit > 0 ? C.green : C.red, fontWeight: "bold" }}>
                  {fmt(d.profit)}
                </td>
                <td style={tdStyle}>{fmt(d.cashStart)}</td>
                <td style={{
                  ...tdStyle,
                  color: d.cashEnd < 0 ? C.red : d.cashEnd > initialCash ? C.green : C.text,
                  fontWeight: "bold",
                }}>
                  {fmt(d.cashEnd)}
                </td>
                <td style={tdStyle}>{d.inventory}台</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insight */}
      <div style={{ ...card(), marginTop: 8 }}>
        <div style={lbl}>インサイト</div>
        <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.8 }}>
          <div>• 初期資金 <strong style={{ color: C.text }}>{fmtMan(initialCash)}</strong> で最大 <strong style={{ color: C.orange }}>{maxUnitsWithCash}台/月</strong> の仕入れが可能</div>
          <div>• 月 <strong style={{ color: C.orange }}>{monthlyUnits}台</strong> × 粗利 <strong style={{ color: C.green }}>{fmtMan(avgProfit)}</strong> = 月間粗利 <strong style={{ color: C.green }}>{fmtMan(monthlyUnits * avgProfit)}</strong>（固定費控除前）</div>
          <div>• 在庫回転: 約 <strong style={{ color: C.yellow }}>{daysToSell}日</strong> → 月 <strong>{(30 / daysToSell).toFixed(1)}回転</strong></div>
          {monthlyUnits < 50 && (
            <div>• 月50台に拡大するには初期資金 <strong style={{ color: C.blue }}>{fmtMan(neededFor50)}</strong> が必要</div>
          )}
        </div>
      </div>
    </div>
  )
}

const tdStyle = {
  textAlign: "right" as const,
  padding: "8px 10px",
  borderBottom: `1px solid ${C.border}40`,
  color: C.textSub,
}
