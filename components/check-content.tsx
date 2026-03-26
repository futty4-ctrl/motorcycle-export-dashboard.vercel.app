"use client"

import { useState, useMemo } from "react"
import { MODEL_CODES, getCCRange } from "@/lib/model-codes"

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
  redDim: "rgba(239,68,68,0.1)",
  yellow: "#eab308",
  blue: "#3b82f6",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

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
const SHIPPING: Record<string, Record<string, number>> = {
  大阪: { "～125cc": 0, "126～750cc": 0 },
  関東: { "～125cc": 12430, "126～750cc": 12980 },
  九州: { "～125cc": 14300, "126～750cc": 15070 },
}

function getBDSFee(bid: number): number {
  for (const b of BDS_FEES) {
    if (bid < b.max) return b.fee
  }
  return BDS_FEES[BDS_FEES.length - 1].fee
}

const fmt = (n: number) =>
  n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`
const fmtFull = (n: number) => `¥${n.toLocaleString()}`

const CHECKLIST = [
  { id: "engine", label: "エンジン始動・異音", category: "機関" },
  { id: "smoke", label: "白煙・オイル漏れ", category: "機関" },
  { id: "electric", label: "電装（灯火・ウインカー・メーター）", category: "機関" },
  { id: "brake", label: "ブレーキ効き・パッド残量", category: "足回り" },
  { id: "tire", label: "タイヤ溝・ひび割れ", category: "足回り" },
  { id: "fork", label: "フロントフォーク（オイル漏れ・動き）", category: "足回り" },
  { id: "chain", label: "チェーン・スプロケット", category: "足回り" },
  { id: "tank", label: "タンク錆・凹み", category: "外装" },
  { id: "cowl", label: "カウル・外装割れ・傷", category: "外装" },
  { id: "seat", label: "シート破れ", category: "外装" },
  { id: "rust", label: "フレーム・マフラー錆", category: "外装" },
  { id: "key", label: "鍵（メイン・タンク・シート）", category: "書類・付属" },
  { id: "document", label: "書類（車検証・廃車証明）", category: "書類・付属" },
  { id: "mileage", label: "走行距離メーター確認", category: "書類・付属" },
]

type CartItem = {
  label: string
  maker: string
  cc: number
  bdsBid: number
  bdsFee: number
  shipping: number
  marketPrice: number
  medianPrice: number
  profit: number
  profitMedian: number
  memo: string
}

export default function CheckContent() {
  const [search, setSearch] = useState("")
  const [filterMaker, setFilterMaker] = useState("全て")
  const [filterCC, setFilterCC] = useState("全て")
  const [selectedModel, setSelectedModel] = useState<typeof MODEL_CODES[0] | null>(null)
  const [bdsBid, setBdsBid] = useState<number>(0)
  const [venue, setVenue] = useState("大阪")
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [memo, setMemo] = useState("")
  const [scanning, setScanning] = useState(false)
  const [marketPrice, setMarketPrice] = useState<number | null>(null)
  const [medianPrice, setMedianPrice] = useState<number | null>(null)
  const [sampleCount, setSampleCount] = useState<number>(0)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredModels = useMemo(() => {
    let list = MODEL_CODES
    if (filterMaker !== "全て") list = list.filter((m) => m.maker === filterMaker)
    if (filterCC !== "全て") {
      list = list.filter((m) => {
        if (filterCC === "〜50cc") return m.cc <= 50
        if (filterCC === "51〜125cc") return m.cc > 50 && m.cc <= 125
        if (filterCC === "126〜250cc") return m.cc > 125 && m.cc <= 250
        if (filterCC === "251〜400cc") return m.cc > 250 && m.cc <= 400
        return true
      })
    }
    return list
  }, [filterMaker, filterCC])

  const suggestions = useMemo(() => {
    if (!search || search.length < 1) return filteredModels.slice(0, 20)
    const q = search.toLowerCase()
    return filteredModels.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.query.toLowerCase().includes(q) ||
        m.maker.toLowerCase().includes(q) ||
        m.katashiki.some((k) => k.toLowerCase().includes(q))
    ).slice(0, 20)
  }, [search, filteredModels])

  const handleSelect = async (model: typeof MODEL_CODES[0]) => {
    setSelectedModel(model)
    setSearch(model.label)
    setBdsBid(0)
    setChecks({})
    setMemo("")
    setMarketPrice(null)
    setMedianPrice(null)
    setSampleCount(0)

    // 相場を自動取得
    setScanning(true)
    try {
      const params = new URLSearchParams({
        q: model.query,
        limit: "50",
        cat: "26316",
        exclude: "ジャンク,パーツ,部品,外装,エンジン",
      })
      const res = await fetch(`/api/yahoo-auctions/closed?${params}`)
      const data = await res.json()
      if (data.stats && data.stats.count > 0) {
        setMarketPrice(data.stats.trimmedAvg)
        setMedianPrice(data.stats.median)
        setSampleCount(data.stats.count)
      }
    } catch {}
    setScanning(false)
  }

  const ccRange = selectedModel ? getCCRange(selectedModel.cc) : "～125cc"
  const shipping = SHIPPING[venue]?.[selectedModel && selectedModel.cc <= 125 ? "～125cc" : "126～750cc"] ?? 0
  const bdsFee = bdsBid > 0 ? getBDSFee(bdsBid) : 0
  const totalCost = bdsBid + bdsFee + shipping + YAHOO_FEE
  const profit = marketPrice ? marketPrice - totalCost : null
  const profitMedian = medianPrice ? medianPrice - totalCost : null

  const checkedCount = Object.values(checks).filter(Boolean).length
  const totalChecks = CHECKLIST.length
  const allChecked = checkedCount === totalChecks

  const inputStyle = {
    width: "100%",
    background: C.surfaceHigh,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "12px 14px",
    color: C.text,
    fontFamily: C.fontSans,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  }

  return (
    <div style={{ fontFamily: C.font, color: C.text, maxWidth: 600, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: C.fontSans, fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>
          仕入れチェック
        </h1>
        <p style={{ margin: "6px 0 0", fontFamily: C.fontSans, fontSize: 13, color: C.textSub }}>
          BDSで気になる車両を即座に利益判定。チェックリストで見落とし防止。
        </p>
      </div>

      {/* 絞り込みプルダウン */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>メーカー</div>
          <select value={filterMaker} onChange={(e) => { setFilterMaker(e.target.value); setSelectedModel(null); setSearch("") }} style={inputStyle}>
            {["全て", "Honda", "Yamaha", "Suzuki", "Kawasaki"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>排気量</div>
          <select value={filterCC} onChange={(e) => { setFilterCC(e.target.value); setSelectedModel(null); setSearch("") }} style={inputStyle}>
            {["全て", "〜50cc", "51〜125cc", "126〜250cc", "251〜400cc"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* 車種検索 */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
          車種・型式で検索（{filteredModels.length}車種）
        </div>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (selectedModel && e.target.value !== selectedModel.label) {
              setSelectedModel(null)
              setMarketPrice(null)
            }
          }}
          placeholder="例: PCX125, JF28, モンキー...（空欄で一覧表示）"
          style={inputStyle}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {showSuggestions && suggestions.length > 0 && !selectedModel && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              maxHeight: 300,
              overflowY: "auto",
              zIndex: 20,
              marginTop: 4,
            }}
          >
            {suggestions.map((m) => (
              <div
                key={m.query}
                onClick={() => handleSelect(m)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  borderBottom: `1px solid ${C.border}20`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: C.text }}>
                    {m.label}
                  </div>
                  <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted }}>
                    {m.maker} / {m.cc}cc / {m.category}
                  </div>
                </div>
                <span style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted }}>
                  {m.katashiki[0]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 選択済み車種情報 */}
      {selectedModel && (
        <>
          {/* 相場情報 */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 12 }}>
              ヤフオク相場（{scanning ? "取得中..." : `${sampleCount}件`}）
            </div>
            {marketPrice ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 4 }}>平均（上下10%カット）</div>
                  <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 24, color: C.orange }}>{fmtFull(marketPrice)}</div>
                </div>
                <div>
                  <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 4 }}>中央値</div>
                  <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 24, color: C.yellow }}>{fmtFull(medianPrice ?? 0)}</div>
                </div>
              </div>
            ) : !scanning ? (
              <div style={{ fontFamily: C.fontSans, fontSize: 13, color: C.textMuted }}>相場データなし</div>
            ) : null}
          </div>

          {/* BDS入札・会場 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
                BDS入札額（円）
              </div>
              <input
                type="number"
                value={bdsBid || ""}
                onChange={(e) => setBdsBid(parseInt(e.target.value) || 0)}
                placeholder="例: 50000"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
                BDS会場
              </div>
              <select value={venue} onChange={(e) => setVenue(e.target.value)} style={inputStyle}>
                <option value="大阪">大阪（送料¥0）</option>
                <option value="関東">関東</option>
                <option value="九州">九州</option>
              </select>
            </div>
          </div>

          {/* 利益判定 */}
          {bdsBid > 0 && marketPrice && (
            <div
              style={{
                background: profit && profit > 0 ? C.greenDim : C.redDim,
                border: `1px solid ${profit && profit > 0 ? C.green : C.red}40`,
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 12 }}>
                利益判定
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 4 }}>想定利益（平均）</div>
                  <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 28, color: profit && profit > 0 ? C.green : C.red }}>
                    {fmtFull(profit ?? 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 4 }}>想定利益（中央値）</div>
                  <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 28, color: profitMedian && profitMedian > 0 ? C.green : C.red }}>
                    {fmtFull(profitMedian ?? 0)}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { label: "BDS落札", value: fmtFull(bdsBid) },
                  { label: "BDS手数料", value: fmtFull(bdsFee) },
                  { label: "送料", value: fmtFull(shipping) },
                  { label: "ヤフオク手数料", value: fmtFull(YAHOO_FEE) },
                ].map((item) => (
                  <div key={item.label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: C.font, fontSize: 8, color: C.textMuted, marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontFamily: C.font, fontSize: 11, color: C.textSub }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* チェックリスト */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em" }}>
                チェックリスト
              </div>
              <span style={{ fontFamily: C.font, fontSize: 11, color: allChecked ? C.green : C.textMuted }}>
                {checkedCount}/{totalChecks}
              </span>
            </div>
            {["機関", "足回り", "外装", "書類・付属"].map((cat) => (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
                  {cat}
                </div>
                {CHECKLIST.filter((c) => c.category === cat).map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      cursor: "pointer",
                      borderBottom: `1px solid ${C.border}20`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checks[item.id] ?? false}
                      onChange={() => setChecks((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      style={{ accentColor: C.green, width: 18, height: 18 }}
                    />
                    <span style={{
                      fontFamily: C.fontSans,
                      fontSize: 13,
                      color: checks[item.id] ? C.green : C.text,
                      textDecoration: checks[item.id] ? "line-through" : "none",
                    }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          {/* メモ */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
              メモ（気になった点）
            </div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="外装に小傷あり、タイヤ交換必要..."
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          {/* 仕入れ判定サマリー & カート追加 */}
          {bdsBid > 0 && marketPrice && (
            <>
              <div style={{
                background: profit && profit >= 30000 && allChecked ? C.orangeGlow : C.surfaceHigh,
                border: `1px solid ${profit && profit >= 30000 && allChecked ? C.orange : C.border}`,
                borderRadius: 10,
                padding: 20,
                textAlign: "center",
                marginBottom: 12,
              }}>
                {profit && profit >= 30000 && allChecked ? (
                  <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 18, color: C.orange }}>
                    仕入れOK（想定利益 {fmtFull(profit)}）
                  </div>
                ) : (
                  <div style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 14, color: C.textMuted }}>
                    {!allChecked && `チェック未完了（残り${totalChecks - checkedCount}項目）`}
                    {allChecked && profit && profit < 30000 && `利益が目標（¥30,000）に届きません（${fmtFull(profit)}）`}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (!selectedModel || !marketPrice) return
                  setCart((prev) => [...prev, {
                    label: selectedModel.label,
                    maker: selectedModel.maker,
                    cc: selectedModel.cc,
                    bdsBid,
                    bdsFee,
                    shipping,
                    marketPrice: marketPrice,
                    medianPrice: medianPrice ?? 0,
                    profit: profit ?? 0,
                    profitMedian: profitMedian ?? 0,
                    memo,
                  }])
                  setSearch("")
                  setSelectedModel(null)
                  setBdsBid(0)
                  setChecks({})
                  setMemo("")
                  setMarketPrice(null)
                  setMedianPrice(null)
                }}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: C.blue,
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontFamily: C.fontSans,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  marginBottom: 16,
                }}
              >
                仕入れ候補に追加
              </button>
            </>
          )}
        </>
      )}

      {/* 仕入れ候補カート */}
      {cart.length > 0 && (
        <div style={{
          background: C.surface,
          border: `1px solid ${C.blue}40`,
          borderRadius: 10,
          padding: 16,
          marginTop: 8,
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 14, color: C.blue }}>
              今日の仕入れ候補（{cart.length}台）
            </span>
            <button
              onClick={() => { if (confirm("候補リストをクリアしますか？")) setCart([]) }}
              style={{
                padding: "4px 12px",
                background: "none",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.textSub,
                fontFamily: C.font,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              クリア
            </button>
          </div>

          {cart.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: i < cart.length - 1 ? `1px solid ${C.border}20` : "none",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: C.text }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted }}>
                  {item.maker} / {item.cc}cc{item.memo ? ` / ${item.memo}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", marginRight: 12 }}>
                <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted }}>入札</div>
                <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 13, color: C.text }}>
                  {fmtFull(item.bdsBid)}
                </div>
              </div>
              <div style={{ textAlign: "right", marginRight: 12 }}>
                <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted }}>想定利益</div>
                <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 13, color: item.profit > 0 ? C.green : C.red }}>
                  {fmtFull(item.profit)}
                </div>
              </div>
              <button
                onClick={() => setCart((prev) => prev.filter((_, j) => j !== i))}
                style={{
                  padding: "4px 8px",
                  background: "none",
                  border: `1px solid ${C.red}40`,
                  borderRadius: 4,
                  color: C.red,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* 概算サマリー */}
          <div style={{
            marginTop: 12,
            padding: 14,
            background: C.surfaceHigh,
            borderRadius: 8,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 4 }}>合計仕入れ</div>
              <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 18, color: C.text }}>
                {fmtFull(cart.reduce((s, c) => s + c.bdsBid + c.bdsFee + c.shipping, 0))}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 4 }}>合計想定利益</div>
              <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 18, color: cart.reduce((s, c) => s + c.profit, 0) > 0 ? C.green : C.red }}>
                {fmtFull(cart.reduce((s, c) => s + c.profit, 0))}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 4 }}>平均利益/台</div>
              <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 18, color: C.orange }}>
                {fmtFull(Math.round(cart.reduce((s, c) => s + c.profit, 0) / cart.length))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedModel && cart.length === 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
          <div style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 8 }}>
            車種を検索してください
          </div>
          <div style={{ fontFamily: C.fontSans, fontSize: 13, color: C.textMuted }}>
            車種名・型式・メーカー名で検索できます（487車種対応）
          </div>
        </div>
      )}
    </div>
  )
}
