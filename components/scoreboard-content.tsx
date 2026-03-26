"use client"

import { useState, useEffect } from "react"
import { upsertMarketPrice, getMarketPrices } from "@/app/actions/market-prices"
import { MODEL_CODES, CC_RANGES, getCCRange } from "@/lib/model-codes"
import type { MarketPrice } from "@/lib/types"

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

// MODEL_CODESからスコアボード用フォーマットに変換
const MODELS = MODEL_CODES.map((m) => ({
  query: m.query,
  label: m.label,
  category: m.category,
  maker: m.maker,
  cc: m.cc,
  ccRange: m.cc <= 125 ? "～125cc" : "126～750cc",
}))

const CATEGORY_COLORS: Record<string, string> = {
  "4mini": "#f97316",
  "カブ": "#22c55e",
  "スクーター": "#3b82f6",
  "スポーツ125": "#a855f7",
  "オフ250": "#10b981",
  "ネイキッド400": "#ef4444",
  "ネイキッド250": "#f87171",
  "旧車400": "#f59e0b",
  "旧車250": "#fbbf24",
  "レプリカ250": "#ec4899",
  "レプリカ400": "#db2777",
  "スポーツ400": "#8b5cf6",
  "スポーツ250": "#7c3aed",
  "スポーツ": "#6d28d9",
  "アメリカン400": "#64748b",
  "アメリカン250": "#94a3b8",
  "アドベンチャー": "#0ea5e9",
  "旧車50": "#78716c",
  "オフ": "#84cc16",
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
  cc: number
  ccRange: string
  status: ScanStatus
  avgPrice?: number
  medianPrice?: number
  sampleCount?: number
  border?: number
  bdsFee?: number
  rangeMin?: number
  rangeMax?: number
}

export default function ScoreboardContent() {
  const [mode, setMode] = useState<"db" | "scan">("db")
  const [dbData, setDbData] = useState<MarketPrice[]>([])
  const [dbLoading, setDbLoading] = useState(true)
  const [results, setResults] = useState<ModelResult[]>(
    MODELS.map((m) => ({ query: m.query, label: m.label, category: m.category, maker: m.maker, cc: m.cc, ccRange: m.ccRange, status: "pending" as ScanStatus }))
  )
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(0)
  const [scanTotal, setScanTotal] = useState(MODELS.length)
  const [venue, setVenue] = useState("大阪（¥0）")
  const [targetProfit, setTargetProfit] = useState(25000)

  // DB読み込み
  useEffect(() => {
    getMarketPrices().then((res) => {
      if (res.success && res.rows) setDbData(res.rows)
      setDbLoading(false)
    })
  }, [])

  const getShipping = (ccRange: string) => {
    const venueKey = VENUE_KEYS[venue] ?? "大阪"
    return SHIPPING[venueKey]?.[ccRange] ?? 0
  }
  const [exclude, setExclude] = useState("ジャンク,パーツ,部品,外装,エンジン")
  const [bulkRegistering, setBulkRegistering] = useState(false)
  const [bulkDone, setBulkDone] = useState(false)
  const [sortKey, setSortKey] = useState<"border" | "avg" | "median" | "profit">("border")
  const [filterCC, setFilterCC] = useState<string>("全て")
  const [filterMaker, setFilterMaker] = useState<string>("全て")
  const [showMissing, setShowMissing] = useState(false)

  const dbModelSet = new Set(dbData.map((r) => r.model))
  const missingModels = MODELS.filter((m) => !dbModelSet.has(m.label))

  const matchCC = (cc: number, filter: string): boolean => {
    if (filter === "全て") return true
    if (filter === "〜50cc") return cc <= 50
    if (filter === "51〜125cc") return cc > 50 && cc <= 125
    if (filter === "126〜250cc") return cc > 125 && cc <= 250
    if (filter === "251〜400cc") return cc > 250 && cc <= 400
    return true
  }

  const displayedResults = results.filter((r) => {
    if (!matchCC(r.cc, filterCC)) return false
    if (filterMaker !== "全て" && r.maker !== filterMaker) return false
    if (showMissing && dbModelSet.has(r.label)) return false
    return true
  })

  const handleScan = async () => {
    setScanning(true)
    setScanned(0)
    setBulkDone(false)

    // フィルター済みの車種のみスキャン（未登録モードなら未登録のみ）
    let targets = MODELS.filter((m) => {
      if (!matchCC(m.cc, filterCC)) return false
      if (filterMaker !== "全て" && m.maker !== filterMaker) return false
      return true
    })
    if (showMissing) {
      targets = targets.filter((m) => !dbModelSet.has(m.label))
    }

    setScanTotal(targets.length)
    setResults(targets.map((m) => ({ query: m.query, label: m.label, category: m.category, maker: m.maker, cc: m.cc, ccRange: m.ccRange, status: "pending" as ScanStatus })))

    for (let i = 0; i < targets.length; i++) {
      const model = targets[i]
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
                    medianPrice: data.stats.median,
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
      if (i < targets.length - 1) {
        await new Promise((r) => setTimeout(r, 600))
      }
    }

    setScanning(false)
  }

  const doneResults = displayedResults.filter((r) => r.status === "done" && r.avgPrice)

  // DBモード: market_pricesからデータを変換
  const dbResults = dbData
    .filter((r) => {
      const cc = (r as Record<string, unknown>).cc as number | null
      if (filterMaker !== "全て" && r.maker !== filterMaker) return false
      if (filterCC !== "全て" && cc) {
        if (filterCC === "〜50cc" && cc > 50) return false
        if (filterCC === "51〜125cc" && (cc <= 50 || cc > 125)) return false
        if (filterCC === "126〜250cc" && (cc <= 125 || cc > 250)) return false
        if (filterCC === "251〜400cc" && (cc <= 250 || cc > 400)) return false
      }
      return r.avg_price > 0
    })
    .map((r) => {
      const cc = ((r as Record<string, unknown>).cc as number) ?? 0
      const ccRange = cc <= 125 ? "～125cc" : "126～750cc"
      const sh = getShipping(ccRange)
      const { border, bdsFee } = calcBorder(r.avg_price, sh, targetProfit)
      const profit = r.avg_price - border - sh - bdsFee - YAHOO_FEE
      return {
        query: r.model,
        label: r.model,
        category: "",
        maker: r.maker,
        cc,
        ccRange,
        status: "done" as ScanStatus,
        avgPrice: r.avg_price,
        medianPrice: 0,
        sampleCount: r.sample_count,
        rangeMin: r.min_price,
        rangeMax: r.max_price,
        liveBorder: border,
        liveProfit: profit,
      }
    })

  // スキャンモード: スキャン結果からデータを変換
  const scanResults = doneResults.map((r) => {
    const md = MODELS.find((m) => m.query === r.query)
    const sh = getShipping(md?.ccRange ?? "～125cc")
    const { border, bdsFee } = r.avgPrice ? calcBorder(r.avgPrice, sh, targetProfit) : { border: 0, bdsFee: 0 }
    const profit = (r.avgPrice ?? 0) - border - sh - bdsFee - YAHOO_FEE
    return { ...r, liveBorder: border, liveProfit: profit }
  })

  const withLive = mode === "db" ? dbResults : scanResults

  const sorted = [...withLive].sort((a, b) => {
    if (sortKey === "border") return b.liveBorder - a.liveBorder
    if (sortKey === "avg") return (b.avgPrice ?? 0) - (a.avgPrice ?? 0)
    if (sortKey === "median") return (b.medianPrice ?? 0) - (a.medianPrice ?? 0)
    if (sortKey === "profit") return b.liveProfit - a.liveProfit
    return 0
  })

  const handleBulkRegister = async () => {
    if (doneResults.length === 0) return
    setBulkRegistering(true)
    for (const r of doneResults) {
      if (!r.avgPrice) continue
      const modelDef = MODELS.find((m) => m.query === r.query)
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
        cc: modelDef?.cc ?? null,
      } as Record<string, unknown>)
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
            全車種 利益スコアボード
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
          全{MODELS.length}車種（50〜400cc）のヤフオク相場を一括スキャンし、BDSボーダーと利益ポテンシャルをランキング表示します。
        </p>
      </div>

      {/* モード切替 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["db", "scan"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "8px 20px",
              background: mode === m ? (m === "db" ? C.blue : C.orange) : C.surfaceHigh,
              border: `1px solid ${mode === m ? (m === "db" ? C.blue : C.orange) : C.border}`,
              borderRadius: 8,
              color: mode === m ? "#fff" : C.textSub,
              fontFamily: C.fontSans,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {m === "db" ? `保存済みデータ（${dbData.length}件）` : "新規スキャン"}
          </button>
        ))}
        {missingModels.length > 0 && (
          <button
            onClick={() => { setShowMissing(!showMissing); if (!showMissing) setMode("scan") }}
            style={{
              padding: "8px 20px",
              background: showMissing ? C.red : C.surfaceHigh,
              border: `1px solid ${showMissing ? C.red : C.border}`,
              borderRadius: 8,
              color: showMissing ? "#fff" : C.red,
              fontFamily: C.fontSans,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            未登録（{missingModels.length}件）
          </button>
        )}
      </div>

      {/* CC帯 / メーカーフィルター */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, alignSelf: "center", letterSpacing: "0.08em" }}>CC帯：</span>
        {["全て", ...CC_RANGES].map((r) => (
          <button key={r} onClick={() => setFilterCC(r)} style={{
            padding: "5px 14px",
            background: filterCC === r ? C.orange : C.surfaceHigh,
            border: `1px solid ${filterCC === r ? C.orange : C.border}`,
            borderRadius: 20,
            color: filterCC === r ? "#fff" : C.textSub,
            fontFamily: C.fontSans, fontSize: 12, cursor: "pointer",
          }}>{r}</button>
        ))}
        <span style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, alignSelf: "center", letterSpacing: "0.08em", marginLeft: 8 }}>メーカー：</span>
        {["全て", "Honda", "Yamaha", "Suzuki", "Kawasaki"].map((m) => (
          <button key={m} onClick={() => setFilterMaker(m)} style={{
            padding: "5px 14px",
            background: filterMaker === m ? C.blue : C.surfaceHigh,
            border: `1px solid ${filterMaker === m ? C.blue : C.border}`,
            borderRadius: 20,
            color: filterMaker === m ? "#fff" : C.textSub,
            fontFamily: C.fontSans, fontSize: 12, cursor: "pointer",
          }}>{m}</button>
        ))}
      </div>

      {/* 計算条件（常に表示） */}
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
            style={{ ...inputStyle, width: 130 }}
          />
        </div>
        {mode === "scan" && (
          <>
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
              {scanning ? `スキャン中... (${scanned}/${scanTotal})` : "スキャン開始"}
            </button>
          </>
        )}
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
                width: `${(scanned / scanTotal) * 100}%`,
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
            {scanned}/{scanTotal} 車種スキャン完了
          </div>
        </div>
      )}

      {/* 結果テーブル or ステータスリスト */}
      {(mode === "db" ? dbResults.length > 0 : doneResults.length > 0) ? (
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
                const labels = { border: "BDSボーダー順", avg: "ヤフオク相場順", median: "中央値順", profit: "利益額順" }
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
            {mode === "scan" && (
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
            )}
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
                    {["#", "車種", "カテゴリ", "ヤフオク平均", "中央値", "BDSボーダー", "想定利益", "相場レンジ", "件数"].map((h) => (
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
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: C.yellow, whiteSpace: "nowrap" as const }}>
                          {fmt(r.medianPrice ?? 0)}
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 700, fontSize: 14, color: C.blue, whiteSpace: "nowrap" as const }}>
                          {r.liveBorder > 0 ? fmt(r.liveBorder) : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}20`, fontFamily: C.fontSans, fontWeight: 700, fontSize: 13, color: r.liveProfit > 0 ? C.green : C.red, whiteSpace: "nowrap" as const }}>
                          {fmt(r.liveProfit)}
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
          {displayedResults.filter((r) => r.status === "error").length > 0 && (
            <div style={{ marginTop: 10, fontFamily: C.font, fontSize: 11, color: C.textMuted, letterSpacing: "0.05em" }}>
              データなし / 取得失敗: {displayedResults.filter((r) => r.status === "error").map((r) => r.label).join(", ")}
            </div>
          )}
        </>
      ) : mode === "scan" ? (
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
            スキャン対象 {displayedResults.length}車種
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 0,
            }}
          >
            {displayedResults.map((r) => {
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
      ) : (
        /* DBモードでデータなし */
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📊</div>
          <div style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 8 }}>
            {dbLoading ? "読み込み中..." : "保存済みデータがありません"}
          </div>
          <div style={{ fontFamily: C.fontSans, fontSize: 13, color: C.textMuted }}>
            「新規スキャン」モードでスキャン→一括登録してください
          </div>
        </div>
      )}
    </div>
  )
}
