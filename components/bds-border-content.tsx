"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { getMarketPrices } from "@/app/actions/market-prices"
import { getPastActualsForModel, type PastActualsSummary } from "@/app/actions/past-actuals"
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

  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([])
  const [selectedMarket, setSelectedMarket] = useState<MarketPrice | null>(null)
  const [manualYahoo, setManualYahoo] = useState("")
  const [useManual, setUseManual] = useState(false)
  const [venue, setVenue] = useState(
    initialVenue && VENUES.includes(initialVenue) ? initialVenue : "関東"
  )
  const [ccRange, setCcRange] = useState("～125cc")
  const [memberType, setMemberType] = useState<"A" | "C">("A")
  const [targetProfit, setTargetProfit] = useState(25000)
  const [bdsBid, setBdsBid] = useState(initialBid)
  const [pastActuals, setPastActuals] = useState<PastActualsSummary | null>(null)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedMarket) {
      setPastActuals(null)
      return
    }
    getPastActualsForModel(selectedMarket.maker, selectedMarket.model).then((res) => {
      if (res.success) setPastActuals(res.data)
    })
  }, [selectedMarket])

  const yahooPrice = useManual
    ? parseInt(manualYahoo) || 0
    : selectedMarket?.avg_price || 0

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

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[
                { label: "相場マスターから選択", value: false },
                { label: "手動入力", value: true },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setUseManual(opt.value)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: 6,
                    background: useManual === opt.value ? C.orange : "none",
                    border: `1px solid ${useManual === opt.value ? C.orange : C.border}`,
                    color: useManual === opt.value ? "#fff" : C.textSub,
                    fontFamily: C.fontSans,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {!useManual ? (
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
            ) : (
              <div>
                <label style={labelStyle}>ヤフオク落札相場（円）</label>
                <input
                  type="number"
                  value={manualYahoo}
                  onChange={(e) => setManualYahoo(e.target.value)}
                  placeholder="例: 150000"
                  style={inputStyle}
                />
              </div>
            )}
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
