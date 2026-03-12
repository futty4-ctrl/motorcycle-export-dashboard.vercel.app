"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { getAnalyticsData, type AnalyticsRow } from "@/app/actions/vehicles"
import type { CSSProperties } from "react"

const C = {
  surface: "#111113",
  border: "#1e1e22",
  orange: "#f5720a",
  text: "#e8e8ec",
  textMuted: "#6b6b74",
  textSub: "#9999a8",
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#eab308",
}
const card: CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: 20,
  marginBottom: 16,
}
const lbl: CSSProperties = {
  fontSize: 11,
  color: C.textMuted,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 12,
}
const GOAL = 1000000
const fmt = (n: number) => `¥${n.toLocaleString()}`
const fmtMan = (n: number) => `${(n / 10000).toFixed(1)}万`

export function AnalyticsCharts() {
  const [rows, setRows] = useState<AnalyticsRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAnalyticsData().then((res) => {
      if (cancelled) return
      if (res.success && res.rows) setRows(res.rows)
      else setError(res.error ?? null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading)
    return (
      <div
        style={{
          padding: 40,
          color: C.textMuted,
          fontFamily:
            '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        読み込み中...
      </div>
    )

  if (error)
    return (
      <div
        style={{
          padding: 12,
          background: `${C.red}10`,
          border: `1px solid ${C.red}40`,
          borderRadius: 8,
          color: C.red,
          fontSize: 13,
        }}
      >
        {error}
      </div>
    )

  if (!rows || rows.length === 0)
    return (
      <div style={{ ...card, textAlign: "center", padding: 60 }}>
        <div
          style={{
            fontSize: 13,
            color: C.textMuted,
            marginBottom: 12,
          }}
        >
          実績データがまだありません
        </div>
        <Link href="/" style={{ color: C.orange, fontSize: 13 }}>
          ダッシュボードへ →
        </Link>
      </div>
    )

  const totalActualProfit = rows.reduce(
    (a, r) => a + (r.actualProfitJpy ?? 0),
    0
  )
  const totalForecastProfit = rows.reduce(
    (a, r) => a + r.predictedProfitJpy,
    0
  )
  const achieveRate =
    GOAL > 0 ? Math.min(Math.round((totalActualProfit / GOAL) * 100), 100) : 0

  const repairData = rows.map((r) => ({
    name:
      (r.vehicleName?.slice(0, 8) ?? r.vehicleId.slice(0, 6)) || "—",
    予想修理費: r.predictedRepairJpy,
    実際の修理費: r.actualRepairJpy ?? 0,
  }))

  const profitData = rows.map((r) => ({
    name:
      (r.vehicleName?.slice(0, 8) ?? r.vehicleId.slice(0, 6)) || "—",
    予想利益: r.predictedProfitJpy,
    実際の利益: r.actualProfitJpy ?? 0,
  }))

  return (
    <div
      style={{
        fontFamily:
          '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        color: C.text,
        padding: "32px 40px",
        maxWidth: 900,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 4,
        }}
      >
        収支
      </div>
      <div
        style={{
          fontSize: 12,
          color: C.textSub,
          marginBottom: 28,
        }}
      >
        月別グラフ・目標進捗・仕入れ余力
      </div>

      {/* KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            ...card,
            marginBottom: 0,
            borderLeft: `3px solid ${C.orange}`,
          }}
        >
          <div style={lbl}>累計実績粗利</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: C.orange,
            }}
          >
            {fmt(totalActualProfit)}
          </div>
        </div>
        <div
          style={{
            ...card,
            marginBottom: 0,
            borderLeft: `3px solid ${C.blue}`,
          }}
        >
          <div style={lbl}>累計予想粗利</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: C.blue,
            }}
          >
            {fmt(totalForecastProfit)}
          </div>
        </div>
        <div
          style={{
            ...card,
            marginBottom: 0,
            borderLeft: `3px solid ${achieveRate >= 100 ? C.green : C.yellow}`,
          }}
        >
          <div style={lbl}>月利目標達成率</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: achieveRate >= 100 ? C.green : C.yellow,
            }}
          >
            {achieveRate}%
          </div>
        </div>
      </div>

      {/* 月利目標進捗バー */}
      <div
        style={{
          ...card,
          borderLeft: `3px solid ${C.orange}`,
        }}
      >
        <div style={lbl}>月利目標進捗</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: C.orange,
            }}
          >
            {fmt(totalActualProfit)}
          </span>
          <span style={{ fontSize: 12, color: C.textSub }}>
            目標 {fmt(GOAL)}
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: "#1e1e22",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${achieveRate}%`,
              background: `linear-gradient(to right, ${C.orange}, ${C.green})`,
              borderRadius: 3,
              transition: "width 0.8s ease",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <span style={{ fontSize: 11, color: C.textSub }}>
            {achieveRate}% 達成
          </span>
          <span style={{ fontSize: 11, color: C.textSub }}>
            あと {fmt(Math.max(GOAL - totalActualProfit, 0))} 分
          </span>
        </div>
      </div>

      {/* 修理費グラフ */}
      <div style={card}>
        <div style={lbl}>修理費：予想 vs 実際</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={repairData} barGap={4}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              stroke={C.textMuted}
              tick={{ fontSize: 11, fill: C.textMuted }}
            />
            <YAxis
              stroke={C.textMuted}
              tick={{ fontSize: 11, fill: C.textMuted }}
              tickFormatter={fmtMan}
            />
            <Tooltip
              formatter={(v: number) => fmt(v)}
              contentStyle={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: C.textSub }} />
            <Bar
              dataKey="予想修理費"
              fill={`${C.blue}80`}
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="実際の修理費"
              fill={C.orange}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 利益グラフ */}
      <div style={card}>
        <div style={lbl}>利益：予想 vs 実際</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={profitData} barGap={4}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              stroke={C.textMuted}
              tick={{ fontSize: 11, fill: C.textMuted }}
            />
            <YAxis
              stroke={C.textMuted}
              tick={{ fontSize: 11, fill: C.textMuted }}
              tickFormatter={fmtMan}
            />
            <Tooltip
              formatter={(v: number) => fmt(v)}
              contentStyle={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: C.textSub }} />
            <Bar
              dataKey="予想利益"
              fill={`${C.blue}80`}
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="実際の利益"
              fill={C.green}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 誤差一覧テーブル */}
      <div style={card}>
        <div style={lbl}>誤差一覧</div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              {["車両名", "予想利益", "実際の利益", "ズレ"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 11,
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
            {rows.map((r) => {
              const diff = (r.actualProfitJpy ?? 0) - r.predictedProfitJpy
              return (
                <tr key={r.vehicleId}>
                  <td
                    style={{
                      padding: "11px 12px",
                      borderBottom: `1px solid ${C.border}50`,
                    }}
                  >
                    <Link
                      href={`/vehicle/${r.vehicleId}`}
                      style={{
                        color: C.orange,
                        textDecoration: "none",
                      }}
                    >
                      {r.vehicleName ?? r.vehicleId.slice(0, 8)}
                    </Link>
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      borderBottom: `1px solid ${C.border}50`,
                      color: C.blue,
                    }}
                  >
                    {fmt(r.predictedProfitJpy)}
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      borderBottom: `1px solid ${C.border}50`,
                      color: C.green,
                    }}
                  >
                    {fmt(r.actualProfitJpy ?? 0)}
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      borderBottom: `1px solid ${C.border}50`,
                      color: diff >= 0 ? C.green : C.red,
                      fontWeight: "bold",
                    }}
                  >
                    {diff >= 0 ? "+" : ""}
                    {fmt(diff)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
