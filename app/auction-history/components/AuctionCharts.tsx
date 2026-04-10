"use client"

import { useMemo } from "react"
import type { AuctionHistoryRecord } from "@/types/auction-history"
import { C } from "@/components/ui-system"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

interface Props {
  rows: AuctionHistoryRecord[]
}

// 入札上限計算: (market_min + market_max) / 2 → ヤフオク手取り × 0.912 → 陸送2万 + 広告700 + 整備3万 → /1.1
function calcBidLimit(r: AuctionHistoryRecord): number | null {
  if (!r.market_min_price || !r.market_max_price) return null
  const assumedSale = (r.market_min_price + r.market_max_price) / 2
  const yahooTakeHome = assumedSale * 0.912
  return Math.max(0, Math.round((yahooTakeHome - 20000 - 700 - 30000) / 1.1))
}

function formatYen(n: number): string {
  if (n >= 10_000) return `¥${(n / 10_000).toFixed(1)}万`
  return `¥${n}`
}

const ORANGE = "#f5720a"
const BLUE = "#3b82f6"
const GREEN = "#22c55e"
const RED = "#ef4444"

export function AuctionCharts({ rows }: Props) {
  // グラフ1: 車種別 落札価格推移（折れ線）
  const lineData = useMemo(() => {
    const soldRows = rows
      .filter((r) => r.result_status === "sold" && r.sold_price && r.auction_date)
      .sort((a, b) => (a.auction_date! < b.auction_date! ? -1 : 1))

    // 上位5車種だけ色分け
    const modelCount = new Map<string, number>()
    for (const r of soldRows) {
      const m = r.model_name || "不明"
      modelCount.set(m, (modelCount.get(m) || 0) + 1)
    }
    const topModels = Array.from(modelCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([m]) => m)

    const byDate = new Map<string, Record<string, number | string>>()
    for (const r of soldRows) {
      const m = r.model_name || "不明"
      if (!topModels.includes(m)) continue
      const date = r.auction_date!
      if (!byDate.has(date)) byDate.set(date, { date })
      byDate.get(date)![m] = r.sold_price!
    }
    return {
      data: Array.from(byDate.values()).sort((a, b) =>
        String(a.date) < String(b.date) ? -1 : 1
      ),
      models: topModels,
    }
  }, [rows])

  // グラフ2: 入札上限 vs 実落札価格（散布図）
  const scatterData = useMemo(() => {
    return rows
      .filter((r) => r.result_status === "sold" && r.sold_price)
      .map((r) => {
        const limit = calcBidLimit(r)
        if (limit == null) return null
        return {
          x: limit,
          y: r.sold_price!,
          model: r.model_name || "不明",
        }
      })
      .filter((v): v is { x: number; y: number; model: string } => v !== null)
  }, [rows])

  // グラフ3: 会場別 月別落札件数
  const barData = useMemo(() => {
    const map = new Map<
      string,
      { month: string; 蚤の市: number; 定例: number }
    >()
    for (const r of rows) {
      if (r.result_status !== "sold") continue
      if (!r.auction_date || !r.auction_type) continue
      const ym = r.auction_date.slice(0, 7)
      if (!map.has(ym)) {
        map.set(ym, { month: ym, 蚤の市: 0, 定例: 0 })
      }
      const entry = map.get(ym)!
      if (r.auction_type === "蚤の市") entry.蚤の市++
      else if (r.auction_type === "定例") entry.定例++
    }
    return Array.from(map.values()).sort((a, b) =>
      a.month < b.month ? -1 : 1
    )
  }, [rows])

  const lineColors = [ORANGE, BLUE, GREEN, "#eab308", "#a855f7"]

  const chartCard = (title: string, children: React.ReactNode) => (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: "bold",
          color: C.text,
          marginBottom: 14,
          letterSpacing: 0.3,
        }}
      >
        {title}
      </div>
      <div style={{ width: "100%", height: 300 }}>{children}</div>
    </div>
  )

  const axisStyle = { fill: C.textSub, fontSize: 11 }
  const tooltipStyle = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.text,
    fontSize: 12,
  }

  return (
    <div>
      {chartCard(
        "① 車種別 落札価格推移（上位5車種・落札のみ）",
        <ResponsiveContainer>
          <LineChart data={lineData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="date" tick={axisStyle} stroke={C.border} />
            <YAxis
              tick={axisStyle}
              stroke={C.border}
              tickFormatter={(v) => formatYen(Number(v))}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => formatYen(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: C.textSub }} />
            {lineData.models.map((m, i) => (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                stroke={lineColors[i % lineColors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {chartCard(
        "② 入札上限 vs 実落札価格（散布図）— 対角線より下＝利益出る",
        <ResponsiveContainer>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis
              type="number"
              dataKey="x"
              name="入札上限"
              tick={axisStyle}
              stroke={C.border}
              tickFormatter={(v) => formatYen(Number(v))}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="実落札額"
              tick={axisStyle}
              stroke={C.border}
              tickFormatter={(v) => formatYen(Number(v))}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => formatYen(v)}
              cursor={{ strokeDasharray: "3 3" }}
            />
            {/* y = x の対角線（参考） */}
            {scatterData.length > 0 && (
              <ReferenceLine
                stroke={RED}
                strokeDasharray="4 4"
                segment={[
                  { x: 0, y: 0 },
                  {
                    x: Math.max(...scatterData.map((d) => d.x)),
                    y: Math.max(...scatterData.map((d) => d.x)),
                  },
                ]}
              />
            )}
            <Scatter data={scatterData} fill={ORANGE} />
          </ScatterChart>
        </ResponsiveContainer>
      )}

      {chartCard(
        "③ 会場別・月別 落札件数（蚤の市 vs 定例）",
        <ResponsiveContainer>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" tick={axisStyle} stroke={C.border} />
            <YAxis tick={axisStyle} stroke={C.border} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: C.textSub }} />
            <Bar dataKey="蚤の市" fill={ORANGE} />
            <Bar dataKey="定例" fill={BLUE} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
