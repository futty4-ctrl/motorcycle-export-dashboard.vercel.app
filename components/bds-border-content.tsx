"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { getMarketPrices } from "@/app/actions/market-prices"
import {
  getPastActualsForModel,
  getEvaluationSnapshot,
  type PastActualsSummary,
} from "@/app/actions/past-actuals"
import { getBdsHistoryForModel, type BdsHistorySummary } from "@/app/actions/bds-history"
import type { MarketPrice } from "@/lib/types"

const C = {
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  border: "#2a2a2a",
  orange: "#f97316",
  green: "#22c55e",
  greenDim: "#14532d",
  red: "#ef4444",
  redDim: "#7f1d1d",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const SHIPPING: Record<string, Record<string, number>> = {
  大阪: {
    "～125cc": 0,
    "126～750cc": 0,
    "751～1200cc": 0,
    "1201～1500cc": 0,
    "1501cc以上": 0,
  },
  関東: {
    "～125cc": 12430,
    "126～750cc": 12980,
    "751～1200cc": 13640,
    "1201～1500cc": 14300,
    "1501cc以上": 14850,
  },
  九州: {
    "～125cc": 14300,
    "126～750cc": 15070,
    "751～1200cc": 15730,
    "1201～1500cc": 16500,
    "1501cc以上": 17160,
  },
}

const CC_RANGES = ["～125cc", "126～750cc", "751～1200cc", "1201～1500cc", "1501cc以上"]
const VENUES = ["大阪", "関東", "九州"]
const MEMBER_TYPES = ["A", "C"] as const
const YAHOO_FEE = 2680 // 落札手数料1980 + 広告費700(100円×7日)

const BDS_FEES: Record<string, { max: number; fee: number }[]> = {
  A: [
    { max: 50000, fee: 3205 },
    { max: 100000, fee: 4389 },
    { max: 200000, fee: 5792 },
    { max: 300000, fee: 6327 },
    { max: 400000, fee: 7081 },
    { max: 500000, fee: 7709 },
    { max: 600000, fee: 8464 },
    { max: Infinity, fee: 9113 },
  ],
  C: [
    { max: 50000, fee: 5300 },
    { max: 100000, fee: 6494 },
    { max: 200000, fee: 7898 },
    { max: 300000, fee: 8432 },
    { max: 400000, fee: 9187 },
    { max: 500000, fee: 9815 },
    { max: 600000, fee: 10569 },
    { max: Infinity, fee: 11220 },
  ],
}

function getBDSFee(bidPrice: number, memberType: string): number {
  const table = BDS_FEES[memberType]
  for (const bracket of table) {
    if (bidPrice < bracket.max) return bracket.fee
  }
  return table[table.length - 1].fee
}

function calcBorder(
  yahooPrice: number,
  shipping: number,
  memberType: string,
  targetProfit: number
): { border: number; bdsFee: number } {
  let estimate = yahooPrice - shipping - YAHOO_FEE - targetProfit - 5000
  for (let i = 0; i < 10; i++) {
    if (estimate <= 0) return { border: 0, bdsFee: 0 }
    const fee = getBDSFee(estimate, memberType)
    const next = yahooPrice - shipping - fee - YAHOO_FEE - targetProfit
    if (Math.abs(next - estimate) < 1) {
      return { border: Math.max(0, Math.floor(next)), bdsFee: fee }
    }
    estimate = next
  }
  const fee = getBDSFee(Math.max(0, estimate), memberType)
  return { border: Math.max(0, Math.floor(estimate)), bdsFee: fee }
}

const fmt = (n: number) =>
  n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`
const fmtFull = (n: number) => `¥${n.toLocaleString()}`

export default function BdsBorderContent() {
  const searchParams = useSearchParams()
  const initialBid = searchParams.get("bid") ?? ""
  const initialModel = searchParams.get("model") ?? ""
  const initialMaker = searchParams.get("maker") ?? ""
  const initialVenue = searchParams.get("venue") ?? ""
  const evalId = searchParams.get("eval") ?? ""

  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([])
  const [selectedMarket, setSelectedMarket] = useState<MarketPrice | null>(null)
  const [manualYahoo, setManualYahoo] = useState("")
  const [priceSource, setPriceSource] = useState<"db" | "actuals" | "bds" | "yahoo" | "eval" | "manual">(
    evalId ? "eval" : "db"
  )
  const [evalSnapshot, setEvalSnapshot] = useState<Awaited<ReturnType<typeof getEvaluationSnapshot>>["data"] | null>(null)
  const [venue, setVenue] = useState(
    initialVenue && VENUES.includes(initialVenue) ? initialVenue : "関東"
  )
  const [ccRange, setCcRange] = useState("～125cc")
  const [memberType, setMemberType] = useState<"A" | "C">("A")
  const [targetProfit, setTargetProfit] = useState(25000)
  const [bdsBid, setBdsBid] = useState(initialBid)
  const [pastActuals, setPastActuals] = useState<PastActualsSummary | null>(null)
  const [bdsHistory, setBdsHistory] = useState<BdsHistorySummary | null>(null)
  const [yahooResults, setYahooResults] = useState<
    Array<{ title: string; price: number; bids: number; endDate: string; url: string }>
  >([])
  const [yahooStats, setYahooStats] = useState<{
    count: number
    avg: number
    median: number
    min: number
    max: number
    trimmedAvg: number
  } | null>(null)
  const [yahooLoading, setYahooLoading] = useState(false)
  const [yahooExpanded, setYahooExpanded] = useState(false)
  const [yahooQuery, setYahooQuery] = useState("")
  const [yahooExclude, setYahooExclude] = useState("ジャンク,パーツ,部品,外装,エンジン,書類なし,不動")
  const [yahooModelType, setYahooModelType] = useState("")

  useEffect(() => {
    getMarketPrices().then((res) => {
      if (res.success && res.rows) {
        setMarketPrices(res.rows)
        // URL params からモデル自動選択
        if (initialModel || initialMaker) {
          const match = res.rows.find(
            (m) =>
              (!initialMaker || m.maker === initialMaker) &&
              (!initialModel || m.model === initialModel)
          )
          if (match) setSelectedMarket(match)
        }
      }
    })
    // evaluation があれば取得
    if (evalId) {
      getEvaluationSnapshot(evalId).then((res) => {
        if (res.success && res.data) setEvalSnapshot(res.data)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedMarket) {
      setPastActuals(null)
      setBdsHistory(null)
      setYahooResults([])
      setYahooStats(null)
      return
    }
    getPastActualsForModel(selectedMarket.maker, selectedMarket.model).then((res) => {
      if (res.success) setPastActuals(res.data)
    })
    getBdsHistoryForModel(selectedMarket.model).then((res) => {
      if (res.success) setBdsHistory(res.data)
    })
    // 車種選択時にクエリ初期化＆自動検索
    const initialQuery = `${selectedMarket.maker} ${selectedMarket.model}`.trim()
    setYahooQuery(initialQuery)
    runYahooSearch(initialQuery)
  }, [selectedMarket])

  const runYahooSearch = (query: string) => {
    if (!query.trim()) {
      setYahooResults([])
      setYahooStats(null)
      return
    }
    setYahooLoading(true)
    const excludeParam = yahooExclude.trim()
      ? `&exclude=${encodeURIComponent(yahooExclude)}`
      : ""
    fetch(
      `/api/yahoo-auctions/closed?q=${encodeURIComponent(query)}&limit=50&cat=26316${excludeParam}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.results)) {
          setYahooResults(d.results)
          setYahooStats(d.stats)
        } else {
          setYahooResults([])
          setYahooStats(null)
        }
      })
      .catch(() => {
        setYahooResults([])
        setYahooStats(null)
      })
      .finally(() => setYahooLoading(false))
  }

  // 型式フィルタ適用（クライアント側・タイトル含有）
  const yahooFilteredResults = yahooModelType.trim()
    ? yahooResults.filter((r) =>
        r.title.toLowerCase().includes(yahooModelType.toLowerCase())
      )
    : yahooResults

  // 型式フィルタ後の再統計
  const yahooFilteredStats = (() => {
    if (yahooFilteredResults.length === 0) return null
    if (yahooFilteredResults.length === yahooResults.length) return yahooStats
    const prices = yahooFilteredResults.map((r) => r.price).sort((a, b) => a - b)
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    const min = prices[0]
    const max = prices[prices.length - 1]
    const median = prices[Math.floor(prices.length / 2)]
    const trimCount = Math.floor(prices.length * 0.1)
    const trimmed = prices.slice(trimCount, prices.length - trimCount)
    const trimmedAvg =
      trimmed.length > 0
        ? Math.round(trimmed.reduce((s, p) => s + p, 0) / trimmed.length)
        : avg
    return { count: prices.length, avg, median, min, max, trimmedAvg }
  })()

  const yahooPrice = (() => {
    switch (priceSource) {
      case "manual":
        return parseInt(manualYahoo) || 0
      case "actuals":
        return Math.round(pastActuals?.medianSoldPrice ?? 0)
      case "bds":
        return Math.round(bdsHistory?.medianSoldPrice ?? 0)
      case "yahoo":
        return yahooFilteredStats?.median ?? yahooStats?.median ?? 0
      case "eval":
        return evalSnapshot?.estimatedSalePrice ?? 0
      case "db":
      default:
        return selectedMarket?.avg_price || 0
    }
  })()

  const shipping = SHIPPING[venue]?.[ccRange] ?? 0
  const { border, bdsFee } =
    yahooPrice > 0
      ? calcBorder(yahooPrice, shipping, memberType, targetProfit)
      : { border: 0, bdsFee: 0 }

  const currentBid = parseInt(bdsBid) || 0
  const isBuy = currentBid > 0 && currentBid <= border
  const isNG = currentBid > 0 && currentBid > border

  const inputStyle = {
    background: C.surfaceHigh,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "10px 14px",
    color: C.text,
    fontFamily: C.fontSans,
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  }

  const labelStyle = {
    display: "block",
    fontFamily: C.font,
    fontSize: 10,
    color: C.textMuted,
    marginBottom: 6,
    letterSpacing: "0.08em",
  }

  return (
    <div style={{ fontFamily: C.font, color: C.text }}>
      {/* Header */}
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
            BDS入札ボーダー計算
          </h1>
          <span
            style={{
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
              letterSpacing: "0.1em",
            }}
          >
            BID_BORDER
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
          ヤフオク落札相場から逆算し、BDSでの最大入札ボーダーを自動算出します。
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left: Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Yahoo price */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: C.fontSans,
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 16,
                color: C.text,
              }}
            >
              ① ヤフオク売却相場
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 14 }}>
              {[
                ...(evalSnapshot
                  ? [{ label: "⚡ 評価データ（入札判断）", value: "eval" as const, note: "auction-dayの最新推定売価" }]
                  : []),
                { label: "🟢 ヤフオク生中央値", value: "yahoo" as const, note: "終了済み落札スクレイピング" },
                { label: "相場マスターDB", value: "db" as const, note: "手動入力値" },
                { label: "自分の売却実績 中央値", value: "actuals" as const, note: "実データ" },
                { label: "BDS落札中央値", value: "bds" as const, note: "BDS履歴1000件" },
                { label: "手入力", value: "manual" as const, note: "その都度" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPriceSource(opt.value)}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 6,
                    background: priceSource === opt.value ? C.orange : "none",
                    border: `1px solid ${priceSource === opt.value ? C.orange : C.border}`,
                    color: priceSource === opt.value ? "#fff" : C.textSub,
                    fontFamily: C.fontSans,
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{opt.note}</div>
                </button>
              ))}
            </div>

            {priceSource === "db" ? (
              <div>
                <label style={labelStyle}>車種を選択</label>
                <select
                  value={selectedMarket?.id ?? ""}
                  onChange={(e) => {
                    const found = marketPrices.find((m) => m.id === e.target.value)
                    setSelectedMarket(found ?? null)
                  }}
                  style={inputStyle}
                >
                  <option value="">-- 車種を選択 --</option>
                  {marketPrices.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.maker} {m.model}
                      {m.year ? ` (${m.year})` : ""} [{m.condition}] —{" "}
                      {fmt(m.avg_price)}
                    </option>
                  ))}
                </select>
                {selectedMarket && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 14px",
                      background: C.surfaceHigh,
                      borderRadius: 6,
                      fontFamily: C.fontSans,
                      fontSize: 12,
                      color: C.textSub,
                      lineHeight: 1.7,
                    }}
                  >
                    <div>平均: {fmtFull(selectedMarket.avg_price)}</div>
                    <div>
                      範囲: {fmtFull(selectedMarket.min_price)} 〜{" "}
                      {fmtFull(selectedMarket.max_price)}
                    </div>
                    <div>サンプル数: {selectedMarket.sample_count}件</div>
                  </div>
                )}
              </div>
            ) : priceSource === "manual" ? (
              <div>
                <label style={labelStyle}>ヤフオク落札相場（円・手入力）</label>
                <input
                  type="number"
                  value={manualYahoo}
                  onChange={(e) => setManualYahoo(e.target.value)}
                  placeholder="例: 150000"
                  style={inputStyle}
                />
              </div>
            ) : priceSource === "actuals" ? (
              <div>
                <label style={labelStyle}>車種を選択（自分の売却実績から中央値を取得）</label>
                <select
                  value={selectedMarket?.id ?? ""}
                  onChange={(e) => {
                    const found = marketPrices.find((m) => m.id === e.target.value)
                    setSelectedMarket(found ?? null)
                  }}
                  style={inputStyle}
                >
                  <option value="">-- 車種を選択 --</option>
                  {marketPrices.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.maker} {m.model}
                      {m.year ? ` (${m.year})` : ""}
                    </option>
                  ))}
                </select>
                {selectedMarket && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "12px 14px",
                      background: pastActuals && pastActuals.count > 0 ? `${C.green}10` : `${C.yellow}10`,
                      border: `1px solid ${pastActuals && pastActuals.count > 0 ? C.green : C.yellow}40`,
                      borderRadius: 6,
                      fontSize: 12,
                      color: C.textSub,
                      lineHeight: 1.7,
                    }}
                  >
                    {pastActuals && pastActuals.count > 0 ? (
                      <>
                        <div>✅ 売却実績 {pastActuals.count}台から算出</div>
                        <div>中央値: <b style={{ color: C.green }}>{fmtFull(Math.round(pastActuals.medianSoldPrice ?? 0))}</b></div>
                        <div>平均: {fmtFull(Math.round(pastActuals.avgSoldPrice ?? 0))}</div>
                      </>
                    ) : (
                      <>
                        <div>⚠ この車種の売却実績がまだありません</div>
                        <div>他のソースに切替 or 実績を貯めてから利用してください</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : priceSource === "eval" && evalSnapshot ? (
              <div
                style={{
                  padding: "12px 14px",
                  background: `${C.orange}10`,
                  border: `1px solid ${C.orange}40`,
                  borderRadius: 6,
                  fontSize: 12,
                  color: C.textSub,
                  lineHeight: 1.8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: C.orange, marginBottom: 8 }}>
                  ⚡ auction-dayの入札判断データから取得
                </div>
                {evalSnapshot.chassisNumber && (
                  <div>車台: <code style={{ fontFamily: "monospace" }}>{evalSnapshot.chassisNumber}</code></div>
                )}
                {(evalSnapshot.maker || evalSnapshot.modelName) && (
                  <div>
                    車種: {evalSnapshot.maker} {evalSnapshot.modelName}
                  </div>
                )}
                {evalSnapshot.vehicleCategory && (
                  <div>カテゴリ: {evalSnapshot.vehicleCategory}</div>
                )}
                <div>
                  推定売価: <b style={{ color: C.green }}>{fmtFull(evalSnapshot.estimatedSalePrice ?? 0)}</b>
                </div>
                {evalSnapshot.bidLimitBest != null && (
                  <div>
                    DB計算ボーダー（利益5万）: <b>{fmtFull(evalSnapshot.bidLimitBest)}</b>
                  </div>
                )}
                {evalSnapshot.bidLimitMin != null && (
                  <div>
                    DB計算ボーダー（利益2万）: <b>{fmtFull(evalSnapshot.bidLimitMin)}</b>
                  </div>
                )}
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                  ※ auction-dayで評価したデータをそのまま相場として使用。
                </div>
              </div>
            ) : priceSource === "bds" ? (
              <div>
                <label style={labelStyle}>車種を選択（BDS落札履歴から中央値を取得）</label>
                <select
                  value={selectedMarket?.id ?? ""}
                  onChange={(e) => {
                    const found = marketPrices.find((m) => m.id === e.target.value)
                    setSelectedMarket(found ?? null)
                  }}
                  style={inputStyle}
                >
                  <option value="">-- 車種を選択 --</option>
                  {marketPrices.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.maker} {m.model}
                      {m.year ? ` (${m.year})` : ""}
                    </option>
                  ))}
                </select>
                {selectedMarket && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "12px 14px",
                      background: bdsHistory && bdsHistory.soldCount > 0 ? `${C.orange}10` : `${C.yellow}10`,
                      border: `1px solid ${bdsHistory && bdsHistory.soldCount > 0 ? C.orange : C.yellow}40`,
                      borderRadius: 6,
                      fontSize: 12,
                      color: C.textSub,
                      lineHeight: 1.7,
                    }}
                  >
                    {bdsHistory && bdsHistory.soldCount > 0 ? (
                      <>
                        <div>🔥 BDS落札履歴 {bdsHistory.soldCount}件から算出</div>
                        <div>落札中央値: <b style={{ color: C.orange }}>{fmtFull(Math.round(bdsHistory.medianSoldPrice ?? 0))}</b></div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                          ※ ヤフオク売却相場の推定として使用（BDS価格×1.2-1.5が現実的、要調整）
                        </div>
                      </>
                    ) : (
                      <>
                        <div>⚠ この車種のBDS落札履歴がありません</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* BDS settings */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: C.fontSans,
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 16,
                color: C.text,
              }}
            >
              ② BDS設定
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <label style={labelStyle}>BDS会場</label>
                <select
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  style={inputStyle}
                >
                  {VENUES.map((v) => (
                    <option key={v} value={v}>
                      {v}会場
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>会員種別</label>
                <select
                  value={memberType}
                  onChange={(e) =>
                    setMemberType(e.target.value as "A" | "C")
                  }
                  style={inputStyle}
                >
                  {MEMBER_TYPES.map((m) => (
                    <option key={m} value={m}>
                      {m}会員
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>排気量区分</label>
              <select
                value={ccRange}
                onChange={(e) => setCcRange(e.target.value)}
                style={inputStyle}
              >
                {CC_RANGES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>目標粗利（円）</label>
              <input
                type="number"
                value={targetProfit}
                onChange={(e) =>
                  setTargetProfit(parseInt(e.target.value) || 0)
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Right: Result */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Border */}
          <div
            style={{
              background: C.surface,
              border: `2px solid ${border > 0 ? C.orange : C.border}`,
              borderRadius: 10,
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: C.font,
                fontSize: 10,
                color: C.textMuted,
                letterSpacing: "0.2em",
                marginBottom: 14,
              }}
            >
              MAX BID BORDER
            </div>
            <div
              style={{
                fontFamily: C.fontSans,
                fontWeight: 800,
                fontSize: border > 0 ? 48 : 32,
                color: border > 0 ? C.orange : C.textMuted,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                marginBottom: 10,
              }}
            >
              {border > 0 ? fmtFull(border) : "---"}
            </div>
            <div
              style={{
                fontFamily: C.font,
                fontSize: 12,
                color: border > 0 ? C.textSub : C.textMuted,
              }}
            >
              {border > 0
                ? `この金額以下なら買い ✅`
                : "条件を入力してください"}
            </div>
          </div>

          {/* BDS bid check */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: C.fontSans,
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 12,
                color: C.text,
              }}
            >
              BDS現在価格チェック
            </div>
            <label style={labelStyle}>BDSの現在価格（円）</label>
            <input
              type="number"
              value={bdsBid}
              onChange={(e) => setBdsBid(e.target.value)}
              placeholder="例: 95000"
              style={inputStyle}
            />
            {currentBid > 0 && border > 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: "18px 16px",
                  borderRadius: 8,
                  background: isBuy ? C.greenDim : C.redDim,
                  border: `1px solid ${isBuy ? C.green : C.red}`,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: C.fontSans,
                    fontWeight: 800,
                    fontSize: 32,
                    color: isBuy ? C.green : C.red,
                  }}
                >
                  {isBuy ? "✅ 買い" : "❌ 見送り"}
                </div>
                <div
                  style={{
                    fontFamily: C.font,
                    fontSize: 11,
                    color: isBuy ? C.green : C.red,
                    marginTop: 6,
                  }}
                >
                  {isBuy
                    ? `ボーダーまで残り ${fmtFull(border - currentBid)} の余裕`
                    : `ボーダーを ${fmtFull(currentBid - border)} オーバー`}
                </div>
              </div>
            )}
          </div>

          {/* Cost breakdown */}
          {border > 0 && (
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontFamily: C.fontSans,
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 14,
                  color: C.text,
                }}
              >
                コスト内訳
              </div>
              {[
                {
                  label: "ヤフオク売却相場",
                  value: yahooPrice,
                  color: C.green,
                  sign: "",
                },
                {
                  label: `送料（${venue}→堺）`,
                  value: shipping,
                  color: C.red,
                  sign: "−",
                },
                {
                  label: `BDS落札料（${memberType}会員）`,
                  value: bdsFee,
                  color: C.red,
                  sign: "−",
                },
                {
                  label: "ヤフオク出品手数料",
                  value: YAHOO_FEE,
                  color: C.red,
                  sign: "−",
                },
                {
                  label: "目標粗利",
                  value: targetProfit,
                  color: C.orange,
                  sign: "−",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom:
                      i < 4 ? `1px solid ${C.border}30` : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: C.font,
                      fontSize: 11,
                      color: C.textSub,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontFamily: C.fontSans,
                      fontSize: 13,
                      fontWeight: 600,
                      color: item.color,
                    }}
                  >
                    {item.sign}
                    {fmtFull(item.value)}
                  </span>
                </div>
              ))}
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 12,
                  borderTop: `1px solid ${C.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: C.fontSans,
                    fontWeight: 700,
                    fontSize: 13,
                    color: C.text,
                  }}
                >
                  最大入札ボーダー
                </span>
                <span
                  style={{
                    fontFamily: C.fontSans,
                    fontWeight: 800,
                    fontSize: 20,
                    color: C.orange,
                  }}
                >
                  {fmtFull(border)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ヤフオク生データ（終了済み落札結果） ── */}
      {selectedMarket && (yahooLoading || yahooResults.length > 0) && (
        <div
          style={{
            marginTop: 24,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${C.green}`,
            borderRadius: 10,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: C.fontSans,
                fontWeight: 700,
                fontSize: 14,
                color: C.text,
              }}
            >
              🟢 ヤフオク 終了済み落札データ（生・オートバイ車体カテゴリ）
            </div>
            <div style={{ fontSize: 11, color: C.textSub }}>
              {yahooLoading ? "取得中..." : `${yahooResults.length}件`}
            </div>
          </div>

          {/* 手動検索ボックス */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 16,
              padding: 12,
              background: C.surfaceHigh,
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={yahooQuery}
                onChange={(e) => setYahooQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runYahooSearch(yahooQuery)
                }}
                placeholder="ヤフオク検索ワード（車種名・年式・色など）"
                style={{
                  flex: 1,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "8px 12px",
                  color: C.text,
                  fontFamily: C.fontSans,
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                onClick={() => runYahooSearch(yahooQuery)}
                disabled={yahooLoading}
                style={{
                  padding: "8px 16px",
                  background: C.green,
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontFamily: C.fontSans,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: yahooLoading ? "not-allowed" : "pointer",
                  opacity: yahooLoading ? 0.6 : 1,
                }}
              >
                {yahooLoading ? "検索中..." : "再検索"}
              </button>
              <button
                onClick={() => {
                  if (selectedMarket) {
                    const q = `${selectedMarket.maker} ${selectedMarket.model}`.trim()
                    setYahooQuery(q)
                    runYahooSearch(q)
                  }
                }}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.textSub,
                  fontFamily: C.fontSans,
                  fontSize: 12,
                  cursor: "pointer",
                }}
                title="選択中の車種名に戻す"
              >
                ↺
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>
                  除外ワード（API側で除外・再検索時反映）
                </div>
                <input
                  value={yahooExclude}
                  onChange={(e) => setYahooExclude(e.target.value)}
                  placeholder="ジャンク,パーツ,部品..."
                  style={{
                    width: "100%",
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    padding: "7px 10px",
                    color: C.text,
                    fontFamily: C.font,
                    fontSize: 11,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>
                  型式で絞る（タイトル部分一致・即時）
                </div>
                <input
                  value={yahooModelType}
                  onChange={(e) => setYahooModelType(e.target.value)}
                  placeholder="例: NC42, JC58"
                  style={{
                    width: "100%",
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    padding: "7px 10px",
                    color: C.text,
                    fontFamily: C.font,
                    fontSize: 11,
                    outline: "none",
                  }}
                />
              </div>
            </div>
            {yahooResults.length > 0 && (
              <div style={{ fontSize: 10, color: C.textMuted, paddingTop: 4 }}>
                取得 {yahooResults.length}件 / 型式フィルタ後 {yahooFilteredResults.length}件
                {yahooFilteredStats && (
                  <span style={{ marginLeft: 12 }}>
                    中央値 <b style={{ color: C.green }}>{fmtFull(yahooFilteredStats.median)}</b>
                    ・ 平均 <b style={{ color: C.orange }}>{fmtFull(yahooFilteredStats.trimmedAvg)}</b>
                  </span>
                )}
              </div>
            )}
          </div>

          {(yahooFilteredStats || yahooStats) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {[
                { label: "落札中央値", value: (yahooFilteredStats ?? yahooStats)!.median, color: C.green },
                { label: "トリム平均", value: (yahooFilteredStats ?? yahooStats)!.trimmedAvg, color: C.orange },
                { label: "最高", value: (yahooFilteredStats ?? yahooStats)!.max, color: C.textSub },
                { label: "最低", value: (yahooFilteredStats ?? yahooStats)!.min, color: C.red },
              ].map((k) => (
                <div
                  key={k.label}
                  style={{
                    background: C.surfaceHigh,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
                    {k.label}
                  </div>
                  <div
                    style={{
                      fontFamily: C.fontSans,
                      fontSize: 18,
                      fontWeight: 700,
                      color: k.color,
                    }}
                  >
                    {fmtFull(k.value)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {yahooFilteredResults.length > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.08em" }}>
                  落札一覧（{yahooExpanded ? "全件" : "上位15件"}
                  {yahooModelType.trim() && ` ・型式「${yahooModelType}」でフィルタ中`}）
                </div>
                <button
                  onClick={() => setYahooExpanded(!yahooExpanded)}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    color: C.textSub,
                    cursor: "pointer",
                    fontFamily: C.fontSans,
                  }}
                >
                  {yahooExpanded ? "折りたたむ" : `全${yahooFilteredResults.length}件表示`}
                </button>
              </div>
              <div style={{ overflowX: "auto", maxHeight: yahooExpanded ? 600 : 400 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surfaceHigh }}>
                      {["終了日", "タイトル", "落札額", "入札"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: h === "タイトル" ? "left" : h === "終了日" ? "left" : "right",
                            padding: "8px 10px",
                            fontSize: 10,
                            color: C.textMuted,
                            fontFamily: C.font,
                            fontWeight: 600,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(yahooExpanded ? yahooFilteredResults : yahooFilteredResults.slice(0, 15)).map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}40` }}>
                        <td style={{ padding: "6px 10px", color: C.textSub, fontSize: 11, whiteSpace: "nowrap" }}>
                          {r.endDate || "—"}
                        </td>
                        <td style={{ padding: "6px 10px", fontSize: 12 }}>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: C.text, textDecoration: "none" }}
                          >
                            {r.title}
                          </a>
                        </td>
                        <td
                          style={{
                            padding: "6px 10px",
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 600,
                            color: C.green,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtFull(r.price)}
                        </td>
                        <td
                          style={{
                            padding: "6px 10px",
                            textAlign: "right",
                            color: C.textSub,
                            fontSize: 11,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.bids}回
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!yahooLoading && yahooResults.length > 0 && yahooFilteredResults.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 12 }}>
              型式「{yahooModelType}」に該当なし。型式欄をクリアするか検索を変えてください。
            </div>
          )}
          {!yahooLoading && yahooResults.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 12 }}>
              ヤフオクに終了済み落札データがありません
            </div>
          )}
        </div>
      )}

      {/* ── BDS落札相場（auction_historyの1000件+データ） ── */}
      {bdsHistory && bdsHistory.soldCount > 0 && (
        <div
          style={{
            marginTop: 24,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${C.orange}`,
            borderRadius: 10,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: C.fontSans,
                fontWeight: 700,
                fontSize: 14,
                color: C.text,
              }}
            >
              🔥 BDS落札相場（過去データ）
            </div>
            <div style={{ fontSize: 11, color: C.textSub }}>
              落札 {bdsHistory.soldCount}件 / 全 {bdsHistory.count}件（落札率 {Math.round(bdsHistory.soldRate * 100)}%）
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              { label: "落札中央値", value: bdsHistory.medianSoldPrice, color: C.orange },
              { label: "落札平均", value: bdsHistory.avgSoldPrice, color: C.textSub },
              { label: "最高落札", value: bdsHistory.maxSoldPrice, color: C.green },
              { label: "最低落札", value: bdsHistory.minSoldPrice, color: C.red },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: C.surfaceHigh,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
                  {k.label}
                </div>
                <div
                  style={{
                    fontFamily: C.fontSans,
                    fontSize: 18,
                    fontWeight: 700,
                    color: k.value != null ? k.color : C.textMuted,
                  }}
                >
                  {k.value != null ? fmtFull(Math.round(k.value)) : "—"}
                </div>
              </div>
            ))}
          </div>

          {/* 計算ボーダーと BDS 落札中央値のギャップ警告 */}
          {bdsHistory.medianSoldPrice != null && border > 0 && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                background:
                  border > bdsHistory.medianSoldPrice
                    ? `${C.green}10`
                    : `${C.red}10`,
                border: `1px solid ${
                  border > bdsHistory.medianSoldPrice ? C.green : C.red
                }40`,
                marginBottom: 16,
                fontSize: 12,
                color: C.textSub,
                lineHeight: 1.7,
              }}
            >
              {border > bdsHistory.medianSoldPrice ? (
                <span>
                  ✅ 計算ボーダー <b style={{ color: C.orange }}>{fmtFull(border)}</b> は
                  BDS落札中央値 <b style={{ color: C.text }}>{fmtFull(Math.round(bdsHistory.medianSoldPrice))}</b>
                  を <b>+{fmtFull(Math.round(border - bdsHistory.medianSoldPrice))}</b> 上回っています。
                  相場通りなら利益出る想定。
                </span>
              ) : (
                <span>
                  ⚠ 計算ボーダー <b style={{ color: C.orange }}>{fmtFull(border)}</b> が
                  BDS落札中央値 <b style={{ color: C.text }}>{fmtFull(Math.round(bdsHistory.medianSoldPrice))}</b>
                  を <b style={{ color: C.red }}>{fmtFull(Math.round(bdsHistory.medianSoldPrice - border))}</b> 下回っています。
                  この車種はボーダーで買えない可能性が高い、または目標利益が強気すぎます。
                </span>
              )}
            </div>
          )}

          {/* 直近の落札履歴 */}
          {bdsHistory.recentSales.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: C.textMuted,
                  marginBottom: 8,
                  letterSpacing: "0.08em",
                }}
              >
                直近の履歴（最新{Math.min(bdsHistory.recentSales.length, 15)}件）
              </div>
              <div style={{ overflowX: "auto", maxHeight: 320 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["日付", "会場", "型式/車名", "結果", "落札額", "走行"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: ["落札額", "走行"].includes(h) ? "right" : "left",
                            padding: "8px 10px",
                            fontSize: 10,
                            color: C.textMuted,
                            fontFamily: C.font,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bdsHistory.recentSales.map((s, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}40` }}>
                        <td style={{ padding: "6px 10px", color: C.textSub, fontSize: 11 }}>
                          {s.auction_date ? String(s.auction_date).slice(5, 10) : "—"}
                        </td>
                        <td style={{ padding: "6px 10px", color: C.textSub, fontSize: 11 }}>
                          {s.region ?? "—"}
                        </td>
                        <td style={{ padding: "6px 10px", fontWeight: 500 }}>
                          {s.model_name ?? "—"}
                        </td>
                        <td style={{ padding: "6px 10px" }}>
                          {s.result_status === "sold" ? (
                            <span style={{ color: C.green, fontSize: 11 }}>落札</span>
                          ) : s.result_status === "unsold" ? (
                            <span style={{ color: C.red, fontSize: 11 }}>流札</span>
                          ) : (
                            <span style={{ color: C.textMuted, fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "6px 10px",
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 600,
                            color: s.result_status === "sold" ? C.orange : C.textMuted,
                          }}
                        >
                          {s.sold_price != null ? fmtFull(s.sold_price) : "—"}
                        </td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: C.textSub, fontSize: 11 }}>
                          {s.mileage_km != null ? `${s.mileage_km.toLocaleString()}K` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 過去実績（選択した車種の実データ） ── */}
      {pastActuals && pastActuals.count > 0 && (
        <div
          style={{
            marginTop: 24,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: C.fontSans,
                fontWeight: 700,
                fontSize: 14,
                color: C.text,
              }}
            >
              過去実績（{selectedMarket?.maker} {selectedMarket?.model}）
            </div>
            <div style={{ fontSize: 11, color: C.textSub }}>
              {pastActuals.count}台の売却実績から集計
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: "平均仕入額",
                value: pastActuals.avgPurchasePrice,
                color: C.textSub,
              },
              {
                label: "平均売却額",
                value: pastActuals.avgSoldPrice,
                color: C.green,
              },
              {
                label: "平均粗利",
                value: pastActuals.avgProfit,
                color: C.orange,
              },
              {
                label: "粗利中央値",
                value: pastActuals.medianProfit,
                color: C.orange,
              },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: C.surfaceHigh,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
                  {k.label}
                </div>
                <div
                  style={{
                    fontFamily: C.fontSans,
                    fontSize: 18,
                    fontWeight: 700,
                    color: k.value != null ? k.color : C.textMuted,
                  }}
                >
                  {k.value != null ? fmtFull(Math.round(k.value)) : "—"}
                </div>
              </div>
            ))}
          </div>

          {/* 現在の計算ボーダーと実績のズレ警告 */}
          {pastActuals.avgPurchasePrice != null && border > 0 && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                background:
                  Math.abs(border - pastActuals.avgPurchasePrice) / pastActuals.avgPurchasePrice > 0.2
                    ? `${C.red}10`
                    : `${C.green}10`,
                border: `1px solid ${
                  Math.abs(border - pastActuals.avgPurchasePrice) / pastActuals.avgPurchasePrice > 0.2
                    ? C.red
                    : C.green
                }40`,
                marginBottom: 16,
                fontSize: 12,
                color: C.textSub,
                lineHeight: 1.7,
              }}
            >
              {Math.abs(border - pastActuals.avgPurchasePrice) / pastActuals.avgPurchasePrice > 0.2 ? (
                <span>
                  ⚠ 計算ボーダー <b style={{ color: C.orange }}>{fmtFull(border)}</b> と
                  過去の平均仕入額 <b style={{ color: C.text }}>{fmtFull(Math.round(pastActuals.avgPurchasePrice))}</b>
                  のズレが20%以上あります。目標利益かヤフオク相場を再確認してください。
                </span>
              ) : (
                <span>
                  ✅ 計算ボーダーは過去の平均仕入額（{fmtFull(Math.round(pastActuals.avgPurchasePrice))}）と
                  概ね一致しています。
                </span>
              )}
            </div>
          )}

          {/* 最近の売却実績（最大10件） */}
          {pastActuals.recentSales.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: C.textMuted,
                  marginBottom: 8,
                  letterSpacing: "0.08em",
                }}
              >
                最近の売却（{Math.min(pastActuals.recentSales.length, 10)}件）
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["管理No", "仕入", "売却", "粗利", "在庫日数", "売却日"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: h === "管理No" || h === "売却日" ? "left" : "right",
                            padding: "8px 10px",
                            fontSize: 10,
                            color: C.textMuted,
                            fontFamily: C.font,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pastActuals.recentSales.map((s) => (
                      <tr key={s.management_code} style={{ borderBottom: `1px solid ${C.border}40` }}>
                        <td style={{ padding: "8px 10px", fontFamily: "monospace", color: C.orange }}>
                          {s.management_code}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                          {s.purchase_price != null ? fmtFull(s.purchase_price) : "—"}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: C.green }}>
                          {s.sold_price != null ? fmtFull(s.sold_price) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "8px 10px",
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 600,
                            color: s.actual_profit != null && s.actual_profit >= 0 ? C.orange : C.red,
                          }}
                        >
                          {s.actual_profit != null ? fmtFull(Math.round(s.actual_profit)) : "—"}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: C.textSub }}>
                          {s.days_in_stock != null ? `${s.days_in_stock}日` : "—"}
                        </td>
                        <td style={{ padding: "8px 10px", color: C.textSub, fontSize: 11 }}>
                          {s.sold_date ? String(s.sold_date).slice(0, 10) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 過去実績がない場合の案内 */}
      {selectedMarket && pastActuals && pastActuals.count === 0 && (
        <div
          style={{
            marginTop: 24,
            padding: "14px 20px",
            background: `${C.textMuted}08`,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            fontSize: 12,
            color: C.textSub,
            lineHeight: 1.7,
          }}
        >
          この車種（{selectedMarket.maker} {selectedMarket.model}）の過去売却実績はまだありません。
          実績が貯まると「平均仕入額・粗利中央値」が自動で出て、計算ボーダーとのズレを確認できます。
        </div>
      )}
    </div>
  )
}
