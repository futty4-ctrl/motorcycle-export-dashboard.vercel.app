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
import {
  C,
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

  if (loading) {
    return <div style={{ ...pageWrapper, color: C.textMuted }}>読み込み中...</div>
  }

  if (error) {
    return (
      <div style={pageWrapper}>
        <div
          style={{
            padding: 14,
            background: C.redGlow,
            border: `1px solid ${C.red}40`,
            borderRadius: 8,
            color: C.red,
            fontSize: 13,
          }}
        >
          ⚠ {error}
        </div>
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <div style={pageWrapper}>
        <div style={{ ...pageTitle, marginBottom: 8 }}>収支</div>
        <div style={pageSub}>月別グラフ・目標進捗・仕入れ余力</div>
        <div style={{ ...card(), textAlign: "center", padding: 60 }}>
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
      </div>
    )
  }

  const totalActual = rows.reduce(
    (a, r) => a + (r.actualProfitJpy ?? 0),
    0
  )
  const totalForecast = rows.reduce(
    (a, r) => a + r.predictedProfitJpy,
    0
  )
  const achieveRate = Math.min(
    Math.round((totalActual / GOAL) * 100),
    100
  )
  const pct = achieveRate

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
    <div style={pageWrapper}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            ...pageTitle,
            background: `linear-gradient(135deg, ${C.text} 60%, ${C.orange})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          収支
        </div>
        <div style={pageSub}>月別グラフ・目標進捗・仕入れ余力</div>
      </div>

      {/* KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "累計実績粗利",
            value: fmt(totalActual),
            color: C.orange,
            glow: C.orangeGlow,
          },
          {
            label: "累計予想粗利",
            value: fmt(totalForecast),
            color: C.blue,
            glow: C.blueGlow,
          },
          {
            label: "月利目標達成率",
            value: `${achieveRate}%`,
            color: achieveRate >= 100 ? C.green : C.yellow,
            glow:
              achieveRate >= 100 ? C.greenGlow : C.yellowGlow,
          },
        ].map((k, i) => (
          <div key={i} style={kpiCard(k.color)}>
            <div
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                width: 60,
                height: 60,
                background: `radial-gradient(circle, ${k.glow} 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            <div style={lbl}>{k.label}</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: "bold",
                color: k.color,
                letterSpacing: -1,
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* 月利目標進捗バー */}
      <div
        style={{
          ...card(C.orangeGlow),
          borderLeft: `3px solid ${C.orange}`,
          marginBottom: 24,
        }}
      >
        <div style={lbl}>月利目標進捗</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 12,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 36,
                fontWeight: "bold",
                color: C.orange,
                letterSpacing: -1,
              }}
            >
              {fmt(totalActual)}
            </span>
            <span
              style={{
                fontSize: 13,
                color: C.textMuted,
                marginLeft: 8,
              }}
            >
              / {fmt(GOAL)}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: C.textSub }}>
              仕入れ余力
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: C.green,
              }}
            >
              {fmt(Math.max(GOAL - totalActual, 0))}
            </div>
          </div>
        </div>
        <div
          style={{
            height: 8,
            background: "#1a1a1e",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: `linear-gradient(to right, ${C.orange}, ${C.green})`,
              borderRadius: 4,
              transition: "width 1s ease",
              boxShadow: `0 0 12px ${C.orange}60`,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: pct >= 50 ? C.green : C.textMuted,
              fontWeight: "bold",
            }}
          >
            {pct}% 達成
          </span>
          <span
            style={{ fontSize: 11, color: C.textMuted }}
          >
            目標 {fmt(GOAL)}
          </span>
        </div>
      </div>

      {/* 修理費グラフ */}
      <div style={card()}>
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
                borderRadius: 6,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: C.textSub }} />
            <Bar
              dataKey="予想修理費"
              fill={`${C.blue}80`}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="実際の修理費"
              fill={C.orange}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 利益グラフ */}
      <div style={card()}>
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
                borderRadius: 6,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: C.textSub }} />
            <Bar
              dataKey="予想利益"
              fill={`${C.blue}80`}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="実際の利益"
              fill={C.green}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 誤差一覧 */}
      <div style={card()}>
        <div style={lbl}>誤差一覧</div>
        <table style={table}>
          <thead>
            <tr>
              {["車両名", "予想利益", "実際の利益", "ズレ"].map(
                (h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const diff =
                (r.actualProfitJpy ?? 0) - r.predictedProfitJpy
              return (
                <tr
                  key={r.vehicleId}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      C.surfaceHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "transparent")
                  }
                  style={{ transition: "background 0.15s" }}
                >
                  <td style={td}>
                    <Link
                      href={`/vehicle/${r.vehicleId}`}
                      style={{
                        color: C.orange,
                        textDecoration: "none",
                        fontWeight: "bold",
                      }}
                    >
                      {r.vehicleName ?? r.vehicleId.slice(0, 8)}
                    </Link>
                  </td>
                  <td style={{ ...td, color: C.blue }}>
                    {fmt(r.predictedProfitJpy)}
                  </td>
                  <td style={{ ...td, color: C.green }}>
                    {fmt(r.actualProfitJpy ?? 0)}
                  </td>
                  <td
                    style={{
                      ...td,
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

