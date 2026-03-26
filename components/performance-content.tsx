"use client"

import { useEffect, useState } from "react"
import {
  getInventoryStats,
  type InventoryStats,
  type MonthlyRow,
  type ModelRankRow,
  type VenueRow,
} from "@/app/actions/inventory"

const C = {
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  orange: "#f97316",
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a855f7",
  yellow: "#eab308",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const fmt = (n: number) =>
  n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`
const fmtFull = (n: number) => `¥${n.toLocaleString()}`

function BarChart({ data }: { data: MonthlyRow[] }) {
  if (data.length === 0) return null
  const maxProfit = Math.max(...data.map((d) => d.profit), 1)

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, padding: "0 4px" }}>
      {data.map((d) => {
        const pct = Math.max(4, (d.profit / maxProfit) * 100)
        const label = d.month.slice(5) + "月"
        return (
          <div
            key={d.month}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
          >
            <div
              style={{
                fontFamily: C.font,
                fontSize: 9,
                color: C.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {fmt(d.profit)}
            </div>
            <div
              style={{
                width: "100%",
                height: `${pct}%`,
                background: d.profit >= 0 ? C.orange : C.red,
                borderRadius: "3px 3px 0 0",
                minHeight: 4,
                position: "relative",
              }}
            />
            <div
              style={{
                fontFamily: C.font,
                fontSize: 9,
                color: C.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </div>
            <div
              style={{ fontFamily: C.font, fontSize: 9, color: C.textSub }}
            >
              {d.count}台
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PerformanceContent() {
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [rankSort, setRankSort] = useState<"avgProfit" | "count" | "avgDays">("avgProfit")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getInventoryStats().then((res) => {
      if (res.success && res.stats) setStats(res.stats)
      else setError(res.error ?? "取得失敗")
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ color: C.textMuted, fontFamily: C.fontSans, fontSize: 13, padding: 40 }}>
        読み込み中...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: 14,
          background: "rgba(239,68,68,0.1)",
          border: `1px solid ${C.red}40`,
          borderRadius: 8,
          color: C.red,
          fontFamily: C.fontSans,
          fontSize: 13,
        }}
      >
        {error}
      </div>
    )
  }

  if (!stats || stats.totalSold === 0) {
    return (
      <div style={{ fontFamily: C.font, color: C.text }}>
        <h1 style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 22, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          売却実績
        </h1>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 64,
            textAlign: "center",
            color: C.textMuted,
            fontFamily: C.fontSans,
            fontSize: 13,
            marginTop: 24,
          }}
        >
          在庫管理から「売却済」に更新すると、ここに実績データが表示されます
        </div>
      </div>
    )
  }

  const kpis = [
    { label: "累計売却台数", value: `${stats.totalSold}台`, color: C.orange },
    { label: "累計粗利", value: fmt(stats.totalProfit), color: C.green },
    { label: "平均粗利 / 台", value: fmtFull(stats.avgProfit), color: C.blue },
    { label: "平均在庫日数", value: `${stats.avgDaysToSell}日`, color: stats.avgDaysToSell <= 14 ? C.green : C.yellow },
  ]

  const sortedRanking = [...stats.modelRanking].sort((a, b) => {
    if (rankSort === "avgProfit") return b.avgProfit - a.avgProfit
    if (rankSort === "count") return b.count - a.count
    if (rankSort === "avgDays") return (a.avgDays || 999) - (b.avgDays || 999)
    return 0
  })

  return (
    <div style={{ fontFamily: C.font, color: C.text }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: C.fontSans,
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.02em",
            }}
          >
            売却実績
          </h1>
          <span style={{ fontFamily: C.font, fontSize: 11, color: C.textMuted, letterSpacing: "0.1em" }}>
            PERFORMANCE
          </span>
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: C.fontSans, fontSize: 13, color: C.textSub }}>
          仕入れ〜売却の実績。粗利 = 売却額 − 仕入額 − BDS落札料 − ヤフオク手数料 − 送料。
        </p>
      </div>

      {/* KPIカード */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {kpis.map((k) => (
          <div
            key={k.label}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "18px 20px",
            }}
          >
            <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 10 }}>
              {k.label}
            </div>
            <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 24, color: k.color, letterSpacing: "-0.02em" }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* 月次グラフ */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 20,
          }}
        >
          <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 20 }}>
            月次粗利推移
          </div>
          <BarChart data={stats.monthly} />
        </div>

        {/* BDS会場別 */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 20,
          }}
        >
          <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 16 }}>
            BDS会場別
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {stats.venueData
              .sort((a, b) => b.totalProfit - a.totalProfit)
              .map((v: VenueRow) => {
                const maxProfit = Math.max(...stats.venueData.map((x) => x.totalProfit), 1)
                const pct = Math.max(4, (v.totalProfit / maxProfit) * 100)
                return (
                  <div key={v.venue}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: C.fontSans, fontSize: 13, color: C.text }}>{v.venue}会場</span>
                      <span style={{ fontFamily: C.fontSans, fontSize: 13, fontWeight: 600, color: C.orange }}>
                        {fmt(v.totalProfit)} / {v.count}台
                      </span>
                    </div>
                    <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: C.orange,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* 車種別損益分析 */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${C.border}`,
            background: C.surfaceHigh,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: C.text }}>
            車種別 損益分析
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {(["avgProfit", "count", "avgDays"] as const).map((key) => {
              const labels = { avgProfit: "利益順", count: "台数順", avgDays: "回転順" }
              return (
                <button
                  key={key}
                  onClick={() => setRankSort(key)}
                  style={{
                    padding: "4px 12px",
                    background: rankSort === key ? C.orange : C.surfaceHigh,
                    border: `1px solid ${rankSort === key ? C.orange : C.border}`,
                    borderRadius: 14,
                    color: rankSort === key ? "#fff" : C.textSub,
                    fontFamily: C.fontSans,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {labels[key]}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.surfaceHigh }}>
                {["#", "車種", "メーカー", "台数", "累計粗利", "平均粗利", "在庫日数", "判定"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontFamily: C.font,
                      fontSize: 10,
                      color: C.textMuted,
                      letterSpacing: "0.1em",
                      borderBottom: `1px solid ${C.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRanking.map((r: ModelRankRow, i) => {
                const verdict = r.avgProfit >= 30000 && r.avgDays <= 14
                  ? { label: "優良", color: C.green, bg: "rgba(34,197,94,0.12)" }
                  : r.avgProfit >= 15000
                  ? { label: "合格", color: C.blue, bg: "rgba(59,130,246,0.12)" }
                  : r.avgProfit >= 0
                  ? { label: "要注意", color: C.yellow, bg: "rgba(234,179,8,0.12)" }
                  : { label: "仕入れNG", color: C.red, bg: "rgba(239,68,68,0.15)" }
                return (
                <tr
                  key={`${r.maker}-${r.model}`}
                  style={{ background: r.avgProfit < 0 ? "rgba(239,68,68,0.05)" : i % 2 === 0 ? "transparent" : `${C.surfaceHigh}44` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = r.avgProfit < 0 ? "rgba(239,68,68,0.05)" : i % 2 === 0 ? "transparent" : `${C.surfaceHigh}44`)
                  }
                >
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.font, fontSize: 12, color: i < 3 ? C.orange : C.textMuted, fontWeight: i < 3 ? 700 : 400 }}>
                    {i < 3 ? ["1st", "2nd", "3rd"][i] : `${i + 1}`}
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: C.text }}>
                    {r.model}
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontSize: 12, color: C.textSub }}>
                    {r.maker}
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.font, fontSize: 13, color: C.textSub }}>
                    {r.count}台
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: r.totalProfit >= 0 ? C.green : C.red }}>
                    {fmt(r.totalProfit)}
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 700, fontSize: 14, color: r.avgProfit >= 30000 ? C.orange : r.avgProfit >= 0 ? C.textSub : C.red }}>
                    {fmtFull(r.avgProfit)}
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.font, fontSize: 12, color: r.avgDays > 0 && r.avgDays <= 10 ? C.green : r.avgDays > 20 ? C.red : C.textSub }}>
                    {r.avgDays > 0 ? `${r.avgDays}日` : "—"}
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}20` }}>
                    <span style={{
                      padding: "3px 10px",
                      borderRadius: 10,
                      background: verdict.bg,
                      color: verdict.color,
                      fontFamily: C.fontSans,
                      fontWeight: 700,
                      fontSize: 11,
                      whiteSpace: "nowrap" as const,
                    }}>
                      {verdict.label}
                    </span>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, background: C.surfaceHigh, fontFamily: C.font, fontSize: 10, color: C.textMuted }}>
          判定基準: 優良=平均粗利3万以上＆14日以内 / 合格=1.5万以上 / 要注意=利益薄 / 仕入れNG=赤字
        </div>
      </div>
    </div>
  )
}
