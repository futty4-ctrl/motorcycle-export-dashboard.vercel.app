"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getNextWeekPicks, type NextWeekPick } from "@/app/actions/next-week-picks"
import { toast } from "sonner"

const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  border: "#2a2a2a",
  orange: "#f97316",
  orangeDim: "rgba(249,115,22,0.12)",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
  red: "#ef4444",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const fmt = (n: number | null) => (n == null ? "—" : `¥${Math.round(n).toLocaleString()}`)

function scoreColor(score: number): string {
  if (score >= 70) return C.green
  if (score >= 50) return C.orange
  if (score >= 30) return C.yellow
  return C.textMuted
}

export default function NextWeekContent() {
  const [picks, setPicks] = useState<NextWeekPick[]>([])
  const [totalAnalyzed, setTotalAnalyzed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [targetProfit, setTargetProfit] = useState(50000)
  const [lookbackDays, setLookbackDays] = useState(90)
  const [ratioUsed, setRatioUsed] = useState(1.4)
  const [ratioConfidence, setRatioConfidence] = useState<"high" | "medium" | "low">("low")
  const [ratioSampleSize, setRatioSampleSize] = useState(0)

  const load = async () => {
    setLoading(true)
    const res = await getNextWeekPicks({ targetProfit, lookbackDays, limit: 20 })
    if (res.success) {
      setPicks(res.picks)
      setTotalAnalyzed(res.totalModelsAnalyzed)
      setRatioUsed(res.ratioUsed)
      setRatioConfidence(res.ratioConfidence)
      setRatioSampleSize(res.ratioSampleSize)
    } else {
      toast.error(res.error || "取得失敗")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, fontFamily: C.font, color: C.text }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
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
            🎯 次週のねらい目
          </h1>
          <span style={{ fontFamily: C.font, fontSize: 11, color: C.textMuted, letterSpacing: "0.1em" }}>
            NEXT_WEEK_PICKS
          </span>
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: C.fontSans, fontSize: 13, color: C.textSub }}>
          過去{lookbackDays}日のBDS落札データ＋自分の売却実績から、次のオークションで狙うべき車種を自動算出。
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
            目標利益
          </div>
          <input
            type="number"
            value={targetProfit}
            onChange={(e) => setTargetProfit(parseInt(e.target.value) || 0)}
            style={{
              background: C.surfaceHigh,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "9px 12px",
              color: C.text,
              fontFamily: C.fontSans,
              fontSize: 13,
              width: 140,
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
            分析対象期間
          </div>
          <select
            value={lookbackDays}
            onChange={(e) => setLookbackDays(parseInt(e.target.value))}
            style={{
              background: C.surfaceHigh,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "9px 12px",
              color: C.text,
              fontFamily: C.fontSans,
              fontSize: 13,
              width: 140,
            }}
          >
            <option value={30}>過去30日</option>
            <option value={60}>過去60日</option>
            <option value={90}>過去90日</option>
            <option value={180}>過去180日</option>
          </select>
        </div>
        <button
          onClick={load}
          style={{
            padding: "10px 20px",
            background: C.orange,
            border: "none",
            borderRadius: 6,
            color: "#fff",
            fontFamily: C.fontSans,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          再計算
        </button>
        <div style={{ marginLeft: "auto", fontSize: 11, color: C.textSub }}>
          分析対象車種: {totalAnalyzed}種
        </div>
      </div>

      {/* スコアリング説明 */}
      <div
        style={{
          background: `${C.blue}08`,
          border: `1px solid ${C.blue}30`,
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 20,
          fontSize: 12,
          color: C.textSub,
          lineHeight: 1.8,
        }}
      >
        <div style={{ fontWeight: 600, color: C.blue, marginBottom: 4, fontFamily: C.fontSans }}>
          📊 スコア構成（100点満点）
        </div>
        <div>
          <b style={{ color: C.text }}>40点</b> BDS供給量（90日落札回数）：多いほど買える
          ・
          <b style={{ color: C.text }}>35点</b> 粗利（自分の実績中央値）：高いほど利益
          ・
          <b style={{ color: C.text }}>25点</b> 回転速度（在庫日数）：短いほど良い
        </div>
      </div>

      {/* ランキング */}
      {loading ? (
        <div style={{ color: C.textMuted, textAlign: "center", padding: 40 }}>読み込み中...</div>
      ) : picks.length === 0 ? (
        <div
          style={{
            background: C.surface,
            border: `1px dashed ${C.border}`,
            borderRadius: 10,
            padding: 40,
            textAlign: "center",
            color: C.textMuted,
          }}
        >
          データが不足しています。auction_historyまたはinventory_itemsにデータを追加してから再実行してください。
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {picks.map((p) => (
            <div
              key={p.modelName}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${scoreColor(p.score)}`,
                borderRadius: 10,
                padding: "16px 18px",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 16,
                alignItems: "center",
              }}
            >
              {/* ランク + スコア */}
              <div style={{ textAlign: "center", minWidth: 60 }}>
                <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.08em" }}>RANK</div>
                <div
                  style={{
                    fontFamily: C.fontSans,
                    fontSize: 28,
                    fontWeight: 800,
                    color: scoreColor(p.score),
                    lineHeight: 1,
                  }}
                >
                  #{p.rank}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  Score {p.score}
                </div>
              </div>

              {/* 車種名 + 数字 */}
              <div>
                <div
                  style={{
                    fontFamily: C.fontSans,
                    fontWeight: 700,
                    fontSize: 15,
                    color: C.text,
                    marginBottom: 6,
                  }}
                >
                  {p.maker ? `${p.maker} ` : ""}{p.modelName}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 11, color: C.textSub }}>
                  <span>
                    BDS供給: <b style={{ color: C.text }}>{p.bdsLotCount90d}件</b>
                    <span style={{ color: C.textMuted }}>（落札{p.bdsSoldCount90d}件）</span>
                  </span>
                  {p.bdsSoldMedian != null && (
                    <span>
                      BDS中央値: <b style={{ color: C.orange }}>{fmt(p.bdsSoldMedian)}</b>
                    </span>
                  )}
                  {p.myCount > 0 ? (
                    <>
                      <span>
                        自分: <b style={{ color: C.text }}>{p.myCount}台</b>
                      </span>
                      {p.myProfitMedian != null && (
                        <span>
                          粗利中央値: <b style={{ color: C.green }}>{fmt(p.myProfitMedian)}</b>
                        </span>
                      )}
                      {p.myAvgDaysInStock != null && (
                        <span>
                          平均{Math.round(p.myAvgDaysInStock)}日で売却
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: C.yellow }}>✨ まだ仕入れてない</span>
                  )}
                </div>
                {p.reason.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {p.reason.map((r) => (
                      <span
                        key={r}
                        style={{
                          background: `${scoreColor(p.score)}20`,
                          color: scoreColor(p.score),
                          padding: "2px 8px",
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          fontFamily: C.fontSans,
                        }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 推定上限 + リンク */}
              <div style={{ textAlign: "right", minWidth: 140 }}>
                <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.08em" }}>
                  推定仕入上限
                </div>
                <div
                  style={{
                    fontFamily: C.fontSans,
                    fontSize: 18,
                    fontWeight: 800,
                    color: C.orange,
                    lineHeight: 1.2,
                    marginTop: 4,
                  }}
                >
                  {p.estimatedCeilingPrice != null ? fmt(p.estimatedCeilingPrice) : "—"}
                </div>
                <Link
                  href={`/bds-border?model=${encodeURIComponent(p.modelName)}${p.maker ? `&maker=${encodeURIComponent(p.maker)}` : ""}`}
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.orange,
                    background: `${C.orange}15`,
                    border: `1px solid ${C.orange}60`,
                    borderRadius: 4,
                    textDecoration: "none",
                    fontFamily: C.fontSans,
                  }}
                >
                  ボーダー詳細 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 30,
          padding: "14px 18px",
          background:
            ratioConfidence === "high"
              ? `${C.green}10`
              : ratioConfidence === "medium"
              ? `${C.yellow}10`
              : `${C.textMuted}08`,
          border: `1px solid ${
            ratioConfidence === "high"
              ? `${C.green}40`
              : ratioConfidence === "medium"
              ? `${C.yellow}40`
              : C.border
          }`,
          borderRadius: 10,
          fontSize: 11,
          color: C.textMuted,
          lineHeight: 1.8,
        }}
      >
        <div style={{ fontWeight: 600, color: C.text, marginBottom: 6, fontFamily: C.fontSans, fontSize: 12 }}>
          🧠 BDS→ヤフオク係数: <b style={{ color: scoreColor(ratioConfidence === "high" ? 80 : ratioConfidence === "medium" ? 60 : 30) }}>×{ratioUsed.toFixed(2)}</b>
          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400 }}>
            （自分の実績 {ratioSampleSize}件から学習、信頼度:
            <b style={{
              color: ratioConfidence === "high" ? C.green : ratioConfidence === "medium" ? C.yellow : C.textMuted,
              marginLeft: 4,
            }}>
              {ratioConfidence === "high" ? "高" : ratioConfidence === "medium" ? "中" : "低"}
            </b>）
          </span>
        </div>
        ※ 推定仕入上限の算式：(BDS中央値 × 学習係数 × 0.912 - 30,700円 - 目標利益) / 1.10
        <br />
        ※ 車種別の実績がある場合はその個別係数、ない場合は全体中央値を適用
        <br />
        ※ データが少ない車種（供給2件未満かつ自分の仕入0）は除外
        {ratioConfidence === "low" && (
          <div style={{ color: C.yellow, marginTop: 4 }}>
            ⚠ 実績データが10件未満。まだ仮値（×1.4）ベース。実績を積むと精度UP。
          </div>
        )}
      </div>
    </div>
  )
}
