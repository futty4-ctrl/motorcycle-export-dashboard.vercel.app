"use client"

import { useState } from "react"
import { getRecommendations, type RecommendationResult } from "@/app/actions/recommendations"

const C = {
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  orange: "#f97316",
  orangeGlow: "rgba(249,115,22,0.12)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.1)",
  red: "#ef4444",
  blue: "#3b82f6",
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

const VENUES = ["大阪", "関東", "九州"]

export default function RecommendationContent() {
  const [monthTarget, setMonthTarget] = useState(50)
  const [venue, setVenue] = useState("大阪")
  const [targetProfit, setTargetProfit] = useState(25000)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterCC, setFilterCC] = useState<string>("全て")

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    const res = await getRecommendations(monthTarget, venue, targetProfit)
    if (res.success && res.result) setResult(res.result)
    else setError(res.error ?? "取得失敗")
    setLoading(false)
  }

  const inputStyle = {
    background: C.surfaceHigh,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "9px 12px",
    color: C.text,
    fontFamily: C.fontSans,
    fontSize: 13,
    outline: "none",
  } as const

  return (
    <div style={{ fontFamily: C.font, color: C.text }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ margin: 0, fontFamily: C.fontSans, fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>
            仕入れ推薦
          </h1>
          <span style={{ fontFamily: C.font, fontSize: 11, color: C.textMuted, letterSpacing: "0.1em" }}>
            RECOMMENDATION
          </span>
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: C.fontSans, fontSize: 13, color: C.textSub }}>
          月次目標台数と実績データから「今月あと何をいくつ仕入れるべきか」を自動推薦します。
        </p>
      </div>

      {/* 設定パネル */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 24, display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>月次目標台数</div>
          <input
            type="number"
            value={monthTarget}
            onChange={(e) => setMonthTarget(parseInt(e.target.value) || 0)}
            style={{ ...inputStyle, width: 100 }}
          />
        </div>
        <div>
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>主なBDS会場</div>
          <select value={venue} onChange={(e) => setVenue(e.target.value)} style={{ ...inputStyle, width: 120 }}>
            {VENUES.map((v) => <option key={v} value={v}>{v}会場</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>目標粗利/台（円）</div>
          <input
            type="number"
            value={targetProfit}
            onChange={(e) => setTargetProfit(parseInt(e.target.value) || 0)}
            style={{ ...inputStyle, width: 130 }}
          />
        </div>
        <div>
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>排気量フィルター</div>
          <select value={filterCC} onChange={(e) => setFilterCC(e.target.value)} style={{ ...inputStyle, width: 130 }}>
            {["全て", "〜50cc", "51〜125cc", "126〜250cc", "251〜400cc"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: "10px 28px",
            background: loading ? C.surfaceHigh : C.orange,
            border: `1px solid ${loading ? C.border : C.orange}`,
            borderRadius: 8,
            color: loading ? C.textMuted : "#fff",
            fontFamily: C.fontSans,
            fontWeight: 700,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            whiteSpace: "nowrap" as const,
          }}
        >
          {loading ? "計算中..." : "推薦を生成"}
        </button>
      </div>

      {error && (
        <div style={{ padding: 14, background: "rgba(239,68,68,0.1)", border: `1px solid ${C.red}40`, borderRadius: 8, color: C.red, fontFamily: C.fontSans, fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {/* 進捗サマリー */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "月次目標", value: `${result.monthTarget}台`, color: C.textSub },
              { label: "今月売却済み", value: `${result.soldThisMonth}台`, color: C.green },
              { label: "残り必要台数", value: `${result.remaining}台`, color: result.remaining > 0 ? C.orange : C.green },
              { label: "残り日数", value: `${result.daysLeft}日（1日${result.dailyNeeded}台ペース）`, color: result.dailyNeeded <= 2 ? C.green : C.yellow },
            ].map((k) => (
              <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px" }}>
                <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 10 }}>{k.label}</div>
                <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 20, color: k.color, letterSpacing: "-0.02em" }}>{k.value}</div>
              </div>
            ))}
          </div>

          {result.remaining === 0 ? (
            <div style={{ background: C.greenDim, border: `1px solid ${C.green}`, borderRadius: 10, padding: 32, textAlign: "center", fontFamily: C.fontSans, fontSize: 15, fontWeight: 600, color: C.green }}>
              今月の目標達成済み！
            </div>
          ) : (() => {
            const filtered = result.items.filter((item) => {
              if (filterCC === "全て") return true
              const cc = item.cc ?? 0
              if (filterCC === "〜50cc") return cc <= 50
              if (filterCC === "51〜125cc") return cc > 50 && cc <= 125
              if (filterCC === "126〜250cc") return cc > 125 && cc <= 250
              if (filterCC === "251〜400cc") return cc > 250 && cc <= 400
              return true
            })
            return filtered.length === 0 ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 40, textAlign: "center", fontFamily: C.fontSans, fontSize: 13, color: C.textMuted }}>
              相場マスターにデータがありません。スコアボードでスキャンしてデータを蓄積してください。
            </div>
          ) : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.surfaceHigh, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: C.text }}>
                  推薦仕入れリスト（残り{result.remaining}台の配分）
                </span>
                <span style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted }}>
                  利益効率順（粗利÷在庫日数）
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.surfaceHigh }}>
                      {["#", "車種", "排気量", "推薦台数", "BDSボーダー", "予想粗利/台", "平均在庫日数", "根拠"].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" as const }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => (
                      <tr
                        key={`${item.maker}-${item.model}`}
                        style={{ background: i % 2 === 0 ? "transparent" : `${C.surfaceHigh}44` }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : `${C.surfaceHigh}44`)}
                      >
                        <td style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.font, fontSize: 12, color: i < 3 ? C.orange : C.textMuted, fontWeight: i < 3 ? 700 : 400 }}>
                          {i < 3 ? ["1st", "2nd", "3rd"][i] : `${i + 1}`}
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}20` }}>
                          <div style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: C.text }}>{item.model}</div>
                          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginTop: 2 }}>{item.maker}</div>
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.font, fontSize: 11, color: C.textSub, whiteSpace: "nowrap" as const }}>
                          {item.cc ? `${item.cc}cc` : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}20`, whiteSpace: "nowrap" as const }}>
                          <span style={{
                            display: "inline-block",
                            padding: "4px 14px",
                            background: C.orangeGlow,
                            border: `1px solid ${C.orange}`,
                            borderRadius: 20,
                            fontFamily: C.fontSans,
                            fontWeight: 800,
                            fontSize: 16,
                            color: C.orange,
                          }}>
                            {item.recommendQty}台
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 700, fontSize: 14, color: C.blue, whiteSpace: "nowrap" as const }}>
                          {item.border > 0 ? fmt(item.border) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 700, fontSize: 13, color: item.estProfit >= targetProfit ? C.green : C.textSub, whiteSpace: "nowrap" as const }}>
                          {fmtFull(item.estProfit)}
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.font, fontSize: 12, color: item.avgDaysToSell !== null && item.avgDaysToSell <= 7 ? C.green : item.avgDaysToSell && item.avgDaysToSell > 14 ? C.red : C.textSub, whiteSpace: "nowrap" as const }}>
                          {item.avgDaysToSell !== null ? `${item.avgDaysToSell}日` : "実績なし"}
                          {item.hasActual && <span style={{ color: C.green, marginLeft: 4 }}>✓</span>}
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontSize: 11, color: C.textSub, maxWidth: 200 }}>
                          {item.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, background: C.surfaceHigh, fontFamily: C.font, fontSize: 10, color: C.textMuted }}>
                ※ 相場マスターに登録されている車種のみ表示。スコアボードでスキャンするとデータが増えます。実績データ（✓）がある車種ほど精度が高い。
              </div>
            </div>
          )})()}
        </>
      )}

      {!result && !loading && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 64, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🎯</div>
          <div style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 8 }}>
            目標を設定して推薦を生成してください
          </div>
          <div style={{ fontFamily: C.fontSans, fontSize: 13, color: C.textMuted }}>
            相場マスターの価格データと実際の売却実績をもとに最適な仕入れプランを算出します
          </div>
        </div>
      )}
    </div>
  )
}
