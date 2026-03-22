"use client"

import { useState } from "react"
import { upsertMarketPrice } from "@/app/actions/market-prices"

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
  yellow: "#eab308",
  blue: "#3b82f6",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

// BDS費用（Aメンバー）
const YAHOO_FEE = 2680
const BDS_FEES = [
  { max: 50000, fee: 3205 },
  { max: 100000, fee: 4389 },
  { max: 200000, fee: 5792 },
  { max: 300000, fee: 6327 },
  { max: 400000, fee: 7081 },
  { max: 500000, fee: 7709 },
  { max: 600000, fee: 8464 },
  { max: Infinity, fee: 9113 },
]

function getBDSFee(bid: number): number {
  for (const b of BDS_FEES) {
    if (bid < b.max) return b.fee
  }
  return BDS_FEES[BDS_FEES.length - 1].fee
}

function calcBorder(
  yahooPrice: number,
  shipping: number,
  targetProfit: number
): { border: number; bdsFee: number } {
  let estimate = yahooPrice - shipping - YAHOO_FEE - targetProfit - 5000
  for (let i = 0; i < 10; i++) {
    if (estimate <= 0) return { border: 0, bdsFee: 0 }
    const fee = getBDSFee(estimate)
    const next = yahooPrice - shipping - fee - YAHOO_FEE - targetProfit
    if (Math.abs(next - estimate) < 1) {
      return { border: Math.max(0, Math.floor(next)), bdsFee: fee }
    }
    estimate = next
  }
  const fee = getBDSFee(Math.max(0, estimate))
  return { border: Math.max(0, Math.floor(estimate)), bdsFee: fee }
}

const fmt = (n: number) =>
  n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`

// 車種リスト（ccRange: "～125cc" | "126～750cc"）
const MODELS = [
  // 4mini（高値安定）
  { query: "モンキー Z50", label: "モンキー Z50", category: "4mini", maker: "Honda", ccRange: "～125cc" },
  { query: "ゴリラ Z50J", label: "ゴリラ Z50J", category: "4mini", maker: "Honda", ccRange: "～125cc" },
  { query: "エイプ50", label: "エイプ50", category: "4mini", maker: "Honda", ccRange: "～125cc" },
  { query: "エイプ100", label: "エイプ100", category: "4mini", maker: "Honda", ccRange: "～125cc" },
  { query: "ダックス ST70", label: "ダックス ST70", category: "4mini", maker: "Honda", ccRange: "～125cc" },
  { query: "シャリー CF50", label: "シャリー CF50", category: "4mini", maker: "Honda", ccRange: "～125cc" },
  // カブ系
  { query: "スーパーカブ C50", label: "スーパーカブ C50", category: "カブ", maker: "Honda", ccRange: "～125cc" },
  { query: "スーパーカブ C70", label: "スーパーカブ C70", category: "カブ", maker: "Honda", ccRange: "～125cc" },
  { query: "スーパーカブ C90", label: "スーパーカブ C90", category: "カブ", maker: "Honda", ccRange: "～125cc" },
  { query: "スーパーカブ 110", label: "スーパーカブ110", category: "カブ", maker: "Honda", ccRange: "～125cc" },
  { query: "クロスカブ 110", label: "クロスカブ110", category: "カブ", maker: "Honda", ccRange: "～125cc" },
  // スクーター（125cc）
  { query: "アドレスV125", label: "アドレスV125", category: "スクーター", maker: "Suzuki", ccRange: "～125cc" },
  { query: "シグナスX", label: "シグナスX", category: "スクーター", maker: "Yamaha", ccRange: "～125cc" },
  { query: "PCX125", label: "PCX125", category: "スクーター", maker: "Honda", ccRange: "～125cc" },
  { query: "リード125", label: "リード125", category: "スクーター", maker: "Honda", ccRange: "～125cc" },
  { query: "NMAX 125", label: "NMAX125", category: "スクーター", maker: "Yamaha", ccRange: "～125cc" },
  { query: "ジョルノ AF24", label: "ジョルノ", category: "スクーター", maker: "Honda", ccRange: "～125cc" },
  // スポーツ（125cc）
  { query: "グロム MSX125", label: "グロム MSX125", category: "スポーツ125", maker: "Honda", ccRange: "～125cc" },
  { query: "CBR125R", label: "CBR125R", category: "スポーツ125", maker: "Honda", ccRange: "～125cc" },
  { query: "Z125 PRO", label: "Z125 PRO", category: "スポーツ125", maker: "Kawasaki", ccRange: "～125cc" },
  { query: "KSR110", label: "KSR110", category: "スポーツ125", maker: "Kawasaki", ccRange: "～125cc" },
  // オフ（125cc）
  { query: "XR100 モタード", label: "XR100モタード", category: "オフ", maker: "Honda", ccRange: "～125cc" },
  { query: "CRF100F", label: "CRF100F", category: "オフ", maker: "Honda", ccRange: "～125cc" },
  { query: "TT-R125", label: "TTR125", category: "オフ", maker: "Yamaha", ccRange: "～125cc" },
  // ── 250〜400cc ────────────────────────────────
  // ネイキッド400（需要最大）
  { query: "CB400SF スーパーフォア", label: "CB400SF", category: "ネイキッド400", maker: "Honda", ccRange: "126～750cc" },
  { query: "XJR400", label: "XJR400", category: "ネイキッド400", maker: "Yamaha", ccRange: "126～750cc" },
  { query: "ZRX400", label: "ZRX400", category: "ネイキッド400", maker: "Kawasaki", ccRange: "126～750cc" },
  { query: "GSX400 インパルス", label: "GSX400 Impulse", category: "ネイキッド400", maker: "Suzuki", ccRange: "126～750cc" },
  // 旧車400（高値）
  { query: "CBX400F", label: "CBX400F", category: "旧車400", maker: "Honda", ccRange: "126～750cc" },
  { query: "Z400FX", label: "Z400FX", category: "旧車400", maker: "Kawasaki", ccRange: "126～750cc" },
  { query: "Z400GP", label: "Z400GP", category: "旧車400", maker: "Kawasaki", ccRange: "126～750cc" },
  { query: "GS400 スズキ", label: "GS400", category: "旧車400", maker: "Suzuki", ccRange: "126～750cc" },
  // レーサーレプリカ250（ノスタルジー）
  { query: "NSR250R ホンダ", label: "NSR250R", category: "レプリカ250", maker: "Honda", ccRange: "126～750cc" },
  { query: "RZ250R ヤマハ", label: "RZ250R", category: "レプリカ250", maker: "Yamaha", ccRange: "126～750cc" },
  { query: "RG250Γ ガンマ", label: "RG250Γ", category: "レプリカ250", maker: "Suzuki", ccRange: "126～750cc" },
  { query: "FZR400 ヤマハ", label: "FZR400", category: "レプリカ250", maker: "Yamaha", ccRange: "126～750cc" },
  // スポーツ400
  { query: "CBR400RR ホンダ", label: "CBR400RR", category: "スポーツ400", maker: "Honda", ccRange: "126～750cc" },
  { query: "VFR400R NC30", label: "VFR400R", category: "スポーツ400", maker: "Honda", ccRange: "126～750cc" },
  // オフ250
  { query: "XR250 ホンダ", label: "XR250", category: "オフ250", maker: "Honda", ccRange: "126～750cc" },
  { query: "TT250R ヤマハ", label: "TT250R", category: "オフ250", maker: "Yamaha", ccRange: "126～750cc" },
  { query: "DR250S スズキ", label: "DR250S", category: "オフ250", maker: "Suzuki", ccRange: "126～750cc" },
]

const CATEGORY_COLORS: Record<string, string> = {
  "4mini": "#f97316",
  "カブ": "#22c55e",
  "スクーター": "#3b82f6",
  "スポーツ125": "#a855f7",
  "オフ": "#eab308",
  "ネイキッド400": "#ef4444",
  "旧車400": "#f59e0b",
  "レプリカ250": "#ec4899",
  "スポーツ400": "#8b5cf6",
  "オフ250": "#10b981",
}

const SHIPPING: Record<string, Record<string, number>> = {
  大阪: { "～125cc": 0, "126～750cc": 0 },
  関東: { "～125cc": 12430, "126～750cc": 12980 },
  九州: { "～125cc": 14300, "126～750cc": 15070 },
}
const VENUE_LABELS = ["大阪（¥0）", "関東", "九州"]
const VENUE_KEYS: Record<string, string> = {
  "大阪（¥0）": "大阪",
  "関東": "関東",
  "九州": "九州",
}

type ScanStatus = "pending" | "loading" | "done" | "error"

interface ModelResult {
  query: string
  label: string
  category: string
  maker: string
  status: ScanStatus
  avgPrice?: number
  sampleCount?: number
  border?: number
  bdsFee?: number
  rangeMin?: number
  rangeMax?: number
}

export default function ScoreboardContent() {
  const [results, setResults] = useState<ModelResult[]>(
    MODELS.map((m) => ({ ...m, status: "pending" }))
  )
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(0)
  const [venue, setVenue] = useState("大阪（¥0）")
  const [targetProfit, setTargetProfit] = useState(25000)

  const getShipping = (ccRange: string) => {
    const venueKey = VENUE_KEYS[venue] ?? "大阪"
    return SHIPPING[venueKey]?.[ccRange] ?? 0
  }
  const [exclude, setExclude] = useState("ジャンク,パーツ,部品,外装,エンジン")
  const [bulkRegistering, setBulkRegistering] = useState(false)
  const [bulkDone, setBulkDone] = useState(false)
  const [sortKey, setSortKey] = useState<"border" | "avg" | "profit">("border")

  const handleScan = async () => {
    setScanning(true)
    setScanned(0)
    setBulkDone(false)
    setResults(MODELS.map((m) => ({ ...m, status: "pending" })))

    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i]
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "loading" } : r))
      )

      try {
        const params = new URLSearchParams({
          q: model.query,
          limit: "50",
          cat: "26316",
          exclude,
        })
        const res = await fetch(`/api/yahoo-auctions/closed?${params}`)
        const data = await res.json()

        if (data.stats && data.stats.count > 0) {
          const avg = data.stats.trimmedAvg
          const shipping = getShipping(model.ccRange)
          const { border, bdsFee } = calcBorder(avg, shipping, targetProfit)
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    status: "done",
                    avgPrice: avg,
                    sampleCount: data.stats.count,
                    border,
                    bdsFee,
                    rangeMin: data.stats.range.low,
                    rangeMax: data.stats.range.high,
                  }
                : r
            )
          )
        } else {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "error" } : r
            )
          )
        }
      } catch {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error" } : r
          )
        )
      }

      setScanned(i + 1)
      // レート制限回避のため間隔を置く
      if (i < MODELS.length - 1) {
        await new Promise((r) => setTimeout(r, 600))
      }
    }

    setScanning(false)
  }

  const doneResults = results.filter((r) => r.status === "done" && r.avgPrice)

  const sorted = [...doneResults].sort((a, b) => {
    if (sortKey === "border") return (b.border ?? 0) - (a.border ?? 0)
    if (sortKey === "avg") return (b.avgPrice ?? 0) - (a.avgPrice ?? 0)
    if (sortKey === "profit") return (b.border ?? 0) - (a.border ?? 0)
    return 0
  })

  const handleBulkRegister = async () => {
    if (doneResults.length === 0) return
    setBulkRegistering(true)
    for (const r of doneResults) {
      if (!r.avgPrice) continue
      await upsertMarketPrice({
        maker: r.maker,
        model: r.label,
        avg_price: r.avgPrice,
        min_price: r.rangeMin ?? r.avgPrice,
        max_price: r.rangeMax ?? r.avgPrice,
        sample_count: r.sampleCount ?? 0,
        source: "ヤフオク",
        trend: "flat",
        trend_pct: 0,
        condition: "B",
      })
    }
    setBulkRegistering(false)
    setBulkDone(true)
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
          <h1
            style={{
              margin: 0,
              fontFamily: C.fontSans,
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.02em",
            }}
          >
            125cc 利益スコアボード
          </h1>
          <span
            style={{
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
              letterSpacing: "0.1em",
            }}
          >
            SCOREBOARD
          </span>
        </div>
        <p
          style={{
            margin: "6px 0 0",
            fontFamily: C.fontSans,
            fontSize: 13,
            color: C.textSub,
          }}
        >
          125cc全{MODELS.length}車種のヤフオク相場を一括スキャンし、BDSボーダーと利益ポテンシャルをランキング表示します。
        </p>
      </div>

      {/* スキャン設定 */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 20,
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
            BDS会場（送料）
          </div>
          <select
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            disabled={scanning}
            style={{ ...inputStyle, width: 180 }}
          >
            {VENUE_LABELS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
            目標粗利（円）
          </div>
          <input
            type="number"
            value={targetProfit}
            onChange={(e) => setTargetProfit(parseInt(e.target.value) || 0)}
            disabled={scanning}
            style={{ ...inputStyle, width: 130 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
            除外キーワード
          </div>
          <input
            value={exclude}
            onChange={(e) => setExclude(e.target.value)}
            disabled={scanning}
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const }}
          />
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          style={{
            padding: "10px 28px",
            background: scanning ? C.surfaceHigh : C.orange,
            border: `1px solid ${scanning ? C.border : C.orange}`,
            borderRadius: 8,
            color: scanning ? C.textMuted : "#fff",
            fontFamily: C.fontSans,
            fontWeight: 700,
            fontSize: 14,
            cursor: scanning ? "not-allowed" : "pointer",
            whiteSpace: "nowrap" as const,
            flexShrink: 0,
          }}
        >
          {scanning ? `スキャン中... (${scanned}/${MODELS.length})` : "スキャン開始"}
        </button>
      </div>

      {/* プログレスバー */}
      {scanning && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              height: 4,
              background: C.border,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(scanned / MODELS.length) * 100}%`,
                background: C.orange,
                borderRadius: 2,
                transition: "width 0.3s",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: C.font,
              fontSize: 10,
              color: C.textMuted,
              letterSpacing: "0.08em",
            }}
          >
            {scanned}/{MODELS.length} 車種スキャン完了
          </div>
        </div>
      )}

      {/* 結果テーブル or ステータスリスト */}
      {doneResults.length > 0 ? (
        <>
          {/* ソート + 一括登録 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {(["border", "avg", "profit"] as const).map((key) => {
                const labels = { border: "BDSボーダー順", avg: "ヤフオク相場順", profit: "利益額順" }
                return (
                  <button
                    key={key}
                    onClick={() => setSortKey(key)}
                    style={{
                      padding: "6px 14px",
                      background: sortKey === key ? C.orange : C.surfaceHigh,
                      border: `1px solid ${sortKey === key ? C.orange : C.border}`,
                      borderRadius: 20,
                      color: sortKey === key ? "#fff" : C.textSub,
                      fontFamily: C.fontSans,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {labels[key]}
                  </button>
                )
              })}
            </div>
            <button
              onClick={handleBulkRegister}
              disabled={bulkRegistering || bulkDone}
              style={{
                padding: "8px 18px",
                background: bulkDone ? C.greenDim : C.surfaceHigh,
                border: `1px solid ${bulkDone ? C.green : C.border}`,
                borderRadius: 7,
                color: bulkDone ? C.green : C.textSub,
                fontFamily: C.fontSans,
                fontSize: 12,
                cursor: bulkRegistering || bulkDone ? "not-allowed" : "pointer",
                whiteSpace: "nowrap" as const,
              }}
            >
              {bulkDone
                ? `✓ ${doneResults.length}件登録済み`
                : bulkRegistering
                ? "登録中..."
                : `全${doneResults.length}件を相場マスターに登録`}
            </button>
          </div>

          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.surfaceHigh }}>
                    {["#", "車種", "カテゴリ", "ヤフオク平均", "BDSボーダー", "目標粗利", "相場レンジ", "件数"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
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
                  {sorted.map((r, i) => {
                    const modelDef = MODELS.find((m) => m.query === r.query)
                  const rowShipping = getShipping(modelDef?.ccRange ?? "～125cc")
                  const estProfit = (r.avgPrice ?? 0) - (r.border ?? 0) - rowShipping - YAHOO_FEE
                    const catColor = CATEGORY_COLORS[r.category] ?? C.textMuted
                    return (
                      <tr
                        key={r.query}
                        style={{ background: i % 2 === 0 ? "transparent" : `${C.surfaceHigh}44` }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : `${C.surfaceHigh}44`)
                        }
                      >
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.font, fontSize: 12, color: i < 3 ? C.orange : C.textMuted, fontWeight: i < 3 ? 700 : 400 }}>
                          {i < 3 ? ["1st", "2nd", "3rd"][i] : `${i + 1}`}
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: C.text }}>
                          {r.label}
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20` }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 10,
                              background: `${catColor}20`,
                              border: `1px solid ${catColor}40`,
                              fontFamily: C.font,
                              fontSize: 10,
                              color: catColor,
                              whiteSpace: "nowrap" as const,
                            }}
                          >
                            {r.category}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 700, fontSize: 14, color: C.orange, whiteSpace: "nowrap" as const }}>
                          {fmt(r.avgPrice ?? 0)}
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 700, fontSize: 14, color: C.blue, whiteSpace: "nowrap" as const }}>
                          {(r.border ?? 0) > 0 ? fmt(r.border ?? 0) : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 700, fontSize: 13, color: estProfit >= targetProfit ? C.green : C.red, whiteSpace: "nowrap" as const }}>
                          {fmt(targetProfit)}
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.font, fontSize: 11, color: C.textSub, whiteSpace: "nowrap" as const }}>
                          {fmt(r.rangeMin ?? 0)} 〜 {fmt(r.rangeMax ?? 0)}
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.font, fontSize: 12, color: C.textMuted }}>
                          {r.sampleCount}件
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* スキャン失敗 or データなし件数 */}
          {results.filter((r) => r.status === "error").length > 0 && (
            <div style={{ marginTop: 10, fontFamily: C.font, fontSize: 11, color: C.textMuted, letterSpacing: "0.05em" }}>
              データなし / 取得失敗: {results.filter((r) => r.status === "error").map((r) => r.label).join(", ")}
            </div>
          )}
        </>
      ) : (
        /* スキャン前 or スキャン中のモデルリスト */
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
              fontFamily: C.fontSans,
              fontWeight: 600,
              fontSize: 13,
              color: C.text,
            }}
          >
            スキャン対象 {MODELS.length}車種
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 0,
            }}
          >
            {results.map((r) => {
              const catColor = CATEGORY_COLORS[r.category] ?? C.textMuted
              const statusColor =
                r.status === "loading"
                  ? C.yellow
                  : r.status === "done"
                  ? C.green
                  : r.status === "error"
                  ? C.red
                  : C.textMuted
              return (
                <div
                  key={r.query}
                  style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid ${C.border}20`,
                    borderRight: `1px solid ${C.border}20`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: statusColor,
                      flexShrink: 0,
                      ...(r.status === "loading" ? { animation: "pulse 1s infinite" } : {}),
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: C.fontSans, fontSize: 12, color: C.text }}>{r.label}</div>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 8,
                        background: `${catColor}20`,
                        fontFamily: C.font,
                        fontSize: 9,
                        color: catColor,
                      }}
                    >
                      {r.category}
                    </span>
                  </div>
                  {r.status === "done" && r.avgPrice && (
                    <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 12, color: C.orange }}>
                      {fmt(r.avgPrice)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {!scanning && doneResults.length === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                fontFamily: C.fontSans,
                fontSize: 13,
                color: C.textMuted,
              }}
            >
              「スキャン開始」を押すと全車種のヤフオク相場を自動取得し、BDSボーダーをランキング表示します
            </div>
          )}
        </div>
      )}
    </div>
  )
}
