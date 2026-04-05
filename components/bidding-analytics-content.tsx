"use client"

import { useState, useEffect } from "react"
import {
  getBiddingAnalytics,
  type AnalyticsResult,
} from "@/app/actions/bidding-analytics"

const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  border: "#2a2a2a",
  orange: "#f97316",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const fmt = (n: number) => `¥${Math.round(n).toLocaleString()}`
const fmt万 = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${Math.round(n)}`
const pct = (ratio: number) => `${(ratio * 100).toFixed(1)}%`

export default function BiddingAnalyticsContent() {
  const [data, setData] = useState<AnalyticsResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBiddingAnalytics().then((res) => {
      setData(res)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.textSub,
          padding: 40,
          fontFamily: C.fontSans,
        }}
      >
        読み込み中...
      </div>
    )
  }

  if (!data || !data.success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.red,
          padding: 40,
          fontFamily: C.fontSans,
        }}
      >
        {data?.error ?? "データの取得に失敗しました"}
      </div>
    )
  }

  const totalSold = data.totalSold ?? 0

  // 動画効果の差分
  const videoLift =
    data.videoEffect && data.videoEffect.withoutVideo.avgSoldPrice > 0
      ? (data.videoEffect.withVideo.avgSoldPrice -
          data.videoEffect.withoutVideo.avgSoldPrice) /
        data.videoEffect.withoutVideo.avgSoldPrice
      : 0

  // 曜日別の最大値（バー描画用）
  const maxBidByDay = Math.max(
    ...((data.byEndDay ?? []).map((d) => d.avgBidCount) || [0]),
    1
  )

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: C.fontSans,
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: C.font,
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            振り返り分析
          </h1>
          <p style={{ color: C.textSub, fontSize: 13, marginTop: 6 }}>
            売却済み {totalSold} 台のデータから傾向を分析
          </p>
        </header>

        {totalSold === 0 ? (
          <Card>
            <p style={{ color: C.textMuted, fontSize: 14 }}>
              売却済みの車両がまだありません。
              <br />
              在庫の売却結果を入力すると、ここに分析が表示されます。
            </p>
          </Card>
        ) : (
          <>
            {/* KPIサマリー */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <KPI
                label="売却台数"
                value={`${totalSold}台`}
                color={C.text}
              />
              <KPI
                label="累計利益"
                value={fmt(data.totalProfit ?? 0)}
                color={
                  (data.totalProfit ?? 0) >= 0 ? C.green : C.red
                }
              />
              <KPI
                label="平均利益 / 台"
                value={fmt(data.avgProfit ?? 0)}
                color={(data.avgProfit ?? 0) >= 0 ? C.green : C.red}
              />
              <KPI
                label="平均在庫日数"
                value={`${Math.round(data.avgDaysInStock ?? 0)}日`}
                color={C.blue}
              />
            </div>

            {/* 車種カテゴリ別 */}
            <Card title="# BY_CATEGORY">
              {(data.byCategory ?? []).length === 0 ? (
                <div style={{ color: C.textMuted, fontSize: 13 }}>
                  データなし
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontFamily: C.font,
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ color: C.textSub, textAlign: "left" }}>
                      <Th>カテゴリ</Th>
                      <Th>台数</Th>
                      <Th>平均利益</Th>
                      <Th>平均在庫日数</Th>
                      <Th>累計利益</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.byCategory ?? []).map((c) => (
                      <tr
                        key={c.category}
                        style={{ borderTop: `1px solid ${C.border}` }}
                      >
                        <Td>{c.category}</Td>
                        <Td>{c.count}</Td>
                        <Td color={c.avgProfit >= 0 ? C.green : C.red}>
                          {fmt(c.avgProfit)}
                        </Td>
                        <Td>{Math.round(c.avgDaysInStock)}日</Td>
                        <Td color={c.totalProfit >= 0 ? C.green : C.red}>
                          {fmt(c.totalProfit)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            {/* 動画効果 */}
            <Card title="# VIDEO_EFFECT">
              {data.videoEffect && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <MiniBox
                    label="動画あり"
                    count={data.videoEffect.withVideo.count}
                    price={data.videoEffect.withVideo.avgSoldPrice}
                    bids={data.videoEffect.withVideo.avgBidCount}
                    accent={C.green}
                  />
                  <MiniBox
                    label="動画なし"
                    count={data.videoEffect.withoutVideo.count}
                    price={data.videoEffect.withoutVideo.avgSoldPrice}
                    bids={data.videoEffect.withoutVideo.avgBidCount}
                    accent={C.textSub}
                  />
                </div>
              )}
              {videoLift !== 0 && data.videoEffect && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    background: C.surfaceHigh,
                    borderRadius: 6,
                    fontSize: 12,
                    color: videoLift > 0 ? C.green : C.red,
                    fontFamily: C.font,
                  }}
                >
                  動画の落札額差: {videoLift > 0 ? "+" : ""}
                  {pct(videoLift)}
                </div>
              )}
            </Card>

            {/* 終了曜日別 */}
            <Card title="# BY_END_DAY">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 6,
                }}
              >
                {(data.byEndDay ?? []).map((d) => {
                  const barH =
                    d.avgBidCount > 0 ? (d.avgBidCount / maxBidByDay) * 100 : 0
                  return (
                    <div
                      key={d.day}
                      style={{ textAlign: "center" }}
                    >
                      <div
                        style={{
                          height: 80,
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            width: "60%",
                            height: `${barH}%`,
                            background: C.orange,
                            borderRadius: "4px 4px 0 0",
                            minHeight: d.avgBidCount > 0 ? 2 : 0,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: C.font,
                          fontSize: 11,
                          color: C.textSub,
                        }}
                      >
                        {d.day}
                      </div>
                      <div
                        style={{
                          fontFamily: C.font,
                          fontSize: 10,
                          color: C.textMuted,
                        }}
                      >
                        {d.count}台
                      </div>
                      <div
                        style={{
                          fontFamily: C.font,
                          fontSize: 10,
                          color: C.text,
                          marginTop: 2,
                        }}
                      >
                        {d.avgBidCount.toFixed(1)}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: C.textMuted,
                  fontFamily: C.font,
                }}
              >
                棒 = 平均入札数 / 下段 = 台数・平均入札数
              </div>
            </Card>

            {/* 広告効果（全体平均） */}
            {data.adEffect && (
              <Card title="# AD_EFFECT (全体平均)">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 12,
                  }}
                >
                  <KPI
                    label="平均ウォッチ数"
                    value={data.adEffect.avgWatchCount.toFixed(1)}
                    color={C.blue}
                  />
                  <KPI
                    label="平均入札数"
                    value={data.adEffect.avgBidCount.toFixed(1)}
                    color={C.orange}
                  />
                  <KPI
                    label="平均入札者数"
                    value={data.adEffect.avgBidderCount.toFixed(1)}
                    color={C.yellow}
                  />
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}
    >
      {title && (
        <h2
          style={{
            fontFamily: C.font,
            fontSize: 13,
            margin: "0 0 14px",
            color: C.orange,
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

function KPI({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontFamily: C.font,
          fontSize: 10,
          color: C.textSub,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: C.font,
          fontSize: 22,
          fontWeight: 700,
          color,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function MiniBox({
  label,
  count,
  price,
  bids,
  accent,
}: {
  label: string
  count: number
  price: number
  bids: number
  accent: string
}) {
  return (
    <div
      style={{
        background: C.surfaceHigh,
        borderRadius: 8,
        padding: 12,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div
        style={{
          fontFamily: C.font,
          fontSize: 11,
          color: C.textSub,
        }}
      >
        {label} ({count}台)
      </div>
      <div
        style={{
          fontFamily: C.font,
          fontSize: 18,
          fontWeight: 700,
          color: C.text,
          marginTop: 4,
        }}
      >
        ¥{fmt万(price)}
      </div>
      <div
        style={{
          fontFamily: C.font,
          fontSize: 11,
          color: C.textMuted,
          marginTop: 2,
        }}
      >
        平均入札 {bids.toFixed(1)}
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "8px 10px",
        fontWeight: 400,
        fontSize: 10,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  color,
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <td style={{ padding: "8px 10px", color: color ?? C.text }}>{children}</td>
  )
}
