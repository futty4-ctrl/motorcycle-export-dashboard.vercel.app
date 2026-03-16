"use client"

import { useState } from "react"
import { upsertMarketPrice } from "@/app/actions/market-prices"

const C = {
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  borderLight: "#333333",
  orange: "#f97316",
  orangeGlow: "rgba(249,115,22,0.12)",
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

const fmt = (n: number) =>
  n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`

const PRESETS = [
  "モンキー Z50",
  "ゴリラ Z50J",
  "ダックス ST70",
  "シャリー CF50",
  "スーパーカブ C50",
  "ミニトレ GT80",
]

interface Stats {
  count: number
  avg: number
  trimmedAvg: number
  median: number
  min: number
  max: number
  range: { low: number; high: number }
}

interface Result {
  title: string
  price: number
  bids: number
  endDate: string
  url: string
}

export default function ResearchContent() {
  const [query, setQuery] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [exclude, setExclude] = useState("ジャンク,パーツ,部品")
  const [limit, setLimit] = useState("50")
  const [cat, setCat] = useState("26316")
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [error, setError] = useState("")
  const [searched, setSearched] = useState("")
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleSearch = async (q?: string) => {
    const keyword = q ?? query
    if (!keyword.trim()) return
    setLoading(true)
    setError("")
    setStats(null)
    setResults([])
    setSearched(keyword)
    setRegistered(false)

    try {
      const params = new URLSearchParams({ q: keyword, limit, cat })
      if (minPrice) params.set("min", minPrice)
      if (maxPrice) params.set("max", maxPrice)
      if (exclude) params.set("exclude", exclude)
      const res = await fetch(`/api/yahoo-auctions/closed?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStats(data.stats)
      setResults(data.results ?? [])
    } catch {
      setError(
        "取得に失敗しました。しばらく待ってから再試行してください。"
      )
    } finally {
      setLoading(false)
    }
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
            相場リサーチ
          </h1>
          <span
            style={{
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
              letterSpacing: "0.1em",
            }}
          >
            RESEARCH
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
          ヤフオク落札履歴から相場レンジを自動取得します。
        </p>
      </div>

      {/* 検索ボックス */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="例：モンキー Z50　ゴリラ Z50J"
            style={{
              flex: 1,
              background: C.surfaceHigh,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "12px 16px",
              color: C.text,
              fontFamily: C.fontSans,
              fontSize: 15,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            style={{
              padding: "12px 28px",
              background: C.orange,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontFamily: C.fontSans,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              opacity: !query.trim() || loading ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "検索中..." : "検索"}
          </button>
        </div>

        {/* フィルター */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 4, letterSpacing: "0.08em" }}>カテゴリ</div>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: C.fontSans, fontSize: 12, outline: "none" }}
            >
              <option value="26316">オートバイ車体</option>
              <option value="26308">オートバイ全体</option>
              <option value="26310">アクセサリー</option>
              <option value="">制限なし</option>
            </select>
          </div>
          <div>
            <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 4, letterSpacing: "0.08em" }}>最低価格（円）</div>
            <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="例: 10000" style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: C.font, fontSize: 12, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div>
            <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 4, letterSpacing: "0.08em" }}>最高価格（円）</div>
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="例: 500000" style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: C.font, fontSize: 12, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div>
            <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 4, letterSpacing: "0.08em" }}>取得件数</div>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: C.fontSans, fontSize: 12, outline: "none" }}
            >
              <option value="20">20件</option>
              <option value="50">50件</option>
              <option value="100">100件</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted, marginBottom: 4, letterSpacing: "0.08em" }}>除外キーワード（カンマ区切り）</div>
          <input
            value={exclude}
            onChange={(e) => setExclude(e.target.value)}
            placeholder="例: ジャンク,パーツ,部品"
            style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: C.font, fontSize: 12, outline: "none", boxSizing: "border-box" as const }}
          />
        </div>

        {/* プリセット */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: C.font,
              fontSize: 10,
              color: C.textMuted,
              alignSelf: "center",
            }}
          >
            よく使う：
          </span>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setQuery(p)
                handleSearch(p)
              }}
              style={{
                padding: "5px 12px",
                background: C.surfaceHigh,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                color: C.textSub,
                fontFamily: C.fontSans,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div
          style={{
            background: "#7f1d1d22",
            border: `1px solid ${C.red}`,
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
            color: C.red,
            fontFamily: C.fontSans,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
            color: C.textMuted,
            fontFamily: C.fontSans,
            fontSize: 13,
          }}
        >
          ヤフオク落札データを取得中...
        </div>
      )}

      {/* 統計 */}
      {stats && !loading && (
        <>
          <div
            style={{
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
              marginBottom: 10,
              letterSpacing: "0.08em",
            }}
          >
            「{searched}」の落札結果 {stats.count}件
          </div>

          {/* サマリーカード */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "平均落札価格",
                value: fmt(stats.trimmedAvg),
                sub: "外れ値除去済",
                color: C.orange,
              },
              {
                label: "相場レンジ（25-75%）",
                value: `${fmt(stats.range.low)} 〜 ${fmt(stats.range.high)}`,
                sub: "中央50%の価格帯",
                color: C.blue,
              },
              {
                label: "中央値",
                value: fmt(stats.median),
                sub: `最低 ${fmt(stats.min)} / 最高 ${fmt(stats.max)}`,
                color: C.green,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    fontFamily: C.font,
                    fontSize: 10,
                    color: C.textMuted,
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: C.fontSans,
                    fontWeight: 700,
                    fontSize: 18,
                    color: s.color,
                    marginBottom: 4,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: C.font,
                    fontSize: 10,
                    color: C.textMuted,
                  }}
                >
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* 相場マスター登録ボタン */}
          <div
            style={{
              background: C.orangeGlow,
              border: `1px solid ${C.orange}`,
              borderRadius: 10,
              padding: "14px 20px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: C.fontSans,
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.orange,
                  marginBottom: 3,
                }}
              >
                このデータを相場マスターに登録する
              </div>
              <div
                style={{
                  fontFamily: C.fontSans,
                  fontSize: 12,
                  color: C.textSub,
                }}
              >
                平均 {fmt(stats.trimmedAvg)} / レンジ {fmt(stats.range.low)}〜
                {fmt(stats.range.high)} を登録
              </div>
            </div>
            <button
              type="button"
              disabled={registering || registered}
              onClick={async () => {
                if (!stats) return
                setRegistering(true)
                await upsertMarketPrice({
                  model: searched,
                  avg_price: stats.trimmedAvg,
                  min_price: stats.range.low,
                  max_price: stats.range.high,
                  sample_count: stats.count,
                  source: "ヤフオク",
                  trend: "flat",
                  trend_pct: 0,
                })
                setRegistering(false)
                setRegistered(true)
              }}
              style={{
                padding: "10px 20px",
                background: registered ? C.green : registering ? "#555" : C.orange,
                border: "none",
                borderRadius: 7,
                color: "#fff",
                fontFamily: C.fontSans,
                fontWeight: 600,
                fontSize: 13,
                cursor: registering || registered ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {registered ? "✓ 登録済み" : registering ? "登録中..." : "相場マスターに登録 →"}
            </button>
          </div>

          {/* 落札一覧 */}
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
              落札履歴 ({results.length}件)
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.surfaceHigh }}>
                    {["タイトル", "落札価格", "入札数", "終了日"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
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
                  {results.map((r, i) => (
                    <tr
                      key={i}
                      style={{
                        background:
                          i % 2 === 0 ? "transparent" : `${C.surfaceHigh}44`,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = C.surfaceHover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          i % 2 === 0 ? "transparent" : `${C.surfaceHigh}44`)
                      }
                    >
                      <td
                        style={{
                          padding: "11px 16px",
                          borderBottom: `1px solid ${C.border}20`,
                        }}
                      >
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: C.text,
                            textDecoration: "none",
                            fontFamily: C.fontSans,
                            fontSize: 13,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = C.orange)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = C.text)
                          }
                        >
                          {r.title.length > 50
                            ? r.title.slice(0, 50) + "…"
                            : r.title}
                        </a>
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          borderBottom: `1px solid ${C.border}20`,
                          fontFamily: C.fontSans,
                          fontWeight: 700,
                          fontSize: 14,
                          color:
                            r.price > stats.trimmedAvg
                              ? C.green
                              : r.price < stats.range.low
                                ? C.red
                                : C.orange,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmt(r.price)}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          borderBottom: `1px solid ${C.border}20`,
                          fontFamily: C.font,
                          fontSize: 12,
                          color: C.textMuted,
                        }}
                      >
                        {r.bids}件
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          borderBottom: `1px solid ${C.border}20`,
                          fontFamily: C.font,
                          fontSize: 11,
                          color: C.textMuted,
                        }}
                      >
                        {r.endDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 初期状態 */}
      {!stats && !loading && !error && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 64,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
          <div
            style={{
              fontFamily: C.fontSans,
              fontWeight: 600,
              fontSize: 15,
              color: C.text,
              marginBottom: 8,
            }}
          >
            車種名で検索してください
          </div>
          <div
            style={{
              fontFamily: C.fontSans,
              fontSize: 13,
              color: C.textMuted,
            }}
          >
            ヤフオクの落札履歴から相場レンジを自動取得します
          </div>
        </div>
      )}
    </div>
  )
}
