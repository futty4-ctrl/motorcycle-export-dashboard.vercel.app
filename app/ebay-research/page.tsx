"use client"

import { useState } from "react"

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

const USD_TO_JPY = 150

type SoldItem = {
  title: string
  price: number
  currency: string
  url: string
  image: string
}

type Stats = {
  count: number
  avg: number
  trimmedAvg: number
  median: number
  min: number
  max: number
}

const fmtUSD = (n: number) => `$${n.toFixed(2)}`
const fmtJPY = (n: number) => `¥${Math.round(n).toLocaleString()}`

export default function EbayResearchPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [results, setResults] = useState<SoldItem[]>([])
  const [error, setError] = useState("")
  const [searched, setSearched] = useState("")

  // 利益計算
  const [costPrice, setCostPrice] = useState<number>(0)
  const [shippingCost, setShippingCost] = useState<number>(400)

  const ebayFeeRate = 0.13
  const payoneerFeeRate = 0.02

  const calcProfit = (sellPriceUSD: number) => {
    const sellPriceJPY = sellPriceUSD * USD_TO_JPY
    const ebayFee = sellPriceJPY * ebayFeeRate
    const payoneerFee = sellPriceJPY * payoneerFeeRate
    return sellPriceJPY - costPrice - shippingCost - ebayFee - payoneerFee
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError("")
    setStats(null)
    setResults([])
    setSearched(query)

    try {
      const params = new URLSearchParams({ q: query, limit: "60" })
      const res = await fetch(`/api/ebay-sold?${params}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setStats(data.stats)
        setResults(data.results ?? [])
      }
    } catch {
      setError("検索に失敗しました")
    }
    setLoading(false)
  }

  const inputStyle = {
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
    <div style={{ fontFamily: C.font, color: C.text, maxWidth: 800, margin: "0 auto" }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ margin: 0, fontFamily: C.fontSans, fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>
            eBay輸出リサーチ
          </h1>
          <span style={{ fontFamily: C.font, fontSize: 11, color: C.textMuted, letterSpacing: "0.1em" }}>
            EBAY RESEARCH
          </span>
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: C.fontSans, fontSize: 13, color: C.textSub }}>
          eBayの売り切れ相場を検索→仕入れ値を入力→利益を即計算
        </p>
      </div>

      {/* 検索 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="例: G-SHOCK DW-5600, Pokemon card Japanese, Super Famicom..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: "12px 28px",
            background: loading ? C.surfaceHigh : C.orange,
            border: "none",
            borderRadius: 8,
            color: loading ? C.textMuted : "#fff",
            fontFamily: C.fontSans,
            fontWeight: 700,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            whiteSpace: "nowrap" as const,
          }}
        >
          {loading ? "検索中..." : "eBay検索"}
        </button>
      </div>

      {/* エラー */}
      {error && (
        <div style={{ padding: 14, background: C.redDim, border: `1px solid ${C.red}40`, borderRadius: 8, color: C.red, fontFamily: C.fontSans, fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* 相場結果 */}
      {stats && (
        <>
          {/* 統計カード */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "平均（上下10%カット）", value: fmtUSD(stats.trimmedAvg), sub: fmtJPY(stats.trimmedAvg * USD_TO_JPY), color: C.orange },
              { label: "中央値", value: fmtUSD(stats.median), sub: fmtJPY(stats.median * USD_TO_JPY), color: C.yellow },
              { label: "件数", value: `${stats.count}件`, sub: `${fmtUSD(stats.min)} 〜 ${fmtUSD(stats.max)}`, color: C.textSub },
            ].map((s) => (
              <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: C.font, fontSize: 11, color: C.textMuted, marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* 利益計算パネル */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 14 }}>
              利益計算
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 6 }}>仕入れ値（円）</div>
                <input
                  type="number"
                  value={costPrice || ""}
                  onChange={(e) => setCostPrice(parseInt(e.target.value) || 0)}
                  placeholder="例: 3000"
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
              <div>
                <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 6 }}>送料（円）</div>
                <input
                  type="number"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(parseInt(e.target.value) || 0)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
            </div>

            {costPrice > 0 && (
              <div style={{
                padding: 16,
                background: calcProfit(stats.trimmedAvg) > 0 ? C.greenDim : C.redDim,
                border: `1px solid ${calcProfit(stats.trimmedAvg) > 0 ? C.green : C.red}40`,
                borderRadius: 8,
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 4 }}>想定利益（平均）</div>
                    <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 24, color: calcProfit(stats.trimmedAvg) > 0 ? C.green : C.red }}>
                      {fmtJPY(calcProfit(stats.trimmedAvg))}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 4 }}>想定利益（中央値）</div>
                    <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 24, color: calcProfit(stats.median) > 0 ? C.green : C.red }}>
                      {fmtJPY(calcProfit(stats.median))}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted, marginBottom: 4 }}>利益率</div>
                    <div style={{ fontFamily: C.fontSans, fontWeight: 800, fontSize: 24, color: C.orange }}>
                      {Math.round((calcProfit(stats.trimmedAvg) / costPrice) * 100)}%
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 14 }}>
                  {[
                    { label: "eBay売値", value: fmtJPY(stats.trimmedAvg * USD_TO_JPY) },
                    { label: "仕入れ", value: `-${fmtJPY(costPrice)}` },
                    { label: "送料", value: `-${fmtJPY(shippingCost)}` },
                    { label: "eBay手数料(13%)", value: `-${fmtJPY(stats.trimmedAvg * USD_TO_JPY * ebayFeeRate)}` },
                    { label: "Payoneer(2%)", value: `-${fmtJPY(stats.trimmedAvg * USD_TO_JPY * payoneerFeeRate)}` },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: C.font, fontSize: 7, color: C.textMuted, marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontFamily: C.font, fontSize: 11, color: C.textSub }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 売り切れ一覧 */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.surfaceHigh, fontFamily: C.fontSans, fontWeight: 600, fontSize: 13, color: C.text }}>
              売り切れ商品（{results.length}件）「{searched}」
            </div>
            {results.map((item, i) => {
              const profit = costPrice > 0 ? calcProfit(item.price) : null
              return (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 20px",
                    borderBottom: `1px solid ${C.border}20`,
                    textDecoration: "none",
                    color: C.text,
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt=""
                      style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: C.fontSans, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 14, color: C.orange }}>
                      {fmtUSD(item.price)}
                    </div>
                    <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted }}>
                      {fmtJPY(item.price * USD_TO_JPY)}
                    </div>
                  </div>
                  {profit !== null && (
                    <div style={{ textAlign: "right", flexShrink: 0, minWidth: 80 }}>
                      <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 13, color: profit > 0 ? C.green : C.red }}>
                        {fmtJPY(profit)}
                      </div>
                      <div style={{ fontFamily: C.font, fontSize: 9, color: C.textMuted }}>利益</div>
                    </div>
                  )}
                </a>
              )
            })}
          </div>
        </>
      )}

      {/* 初期状態 */}
      {!stats && !loading && !error && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
          <div style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 8 }}>
            eBayで売れた商品の相場を検索
          </div>
          <div style={{ fontFamily: C.fontSans, fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
            商品名・型番を英語で入力してください
          </div>
          <div style={{ fontFamily: C.font, fontSize: 11, color: C.textMuted }}>
            検索例: G-SHOCK DW-5600 / Pokemon card Japanese / Super Famicom game / Nikon lens
          </div>
        </div>
      )}
    </div>
  )
}
