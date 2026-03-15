"use client"

import { useState, useMemo, useEffect } from "react"
import type { CSSProperties } from "react"
import { getMarketPrices } from "@/lib/queries"
import type { MarketPrice, Source, Trend } from "@/lib/types"

const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  borderLight: "#333333",
  orange: "#f97316",
  orangeDim: "#7c3a10",
  orangeGlow: "rgba(249,115,22,0.15)",
  green: "#22c55e",
  greenDim: "#14532d",
  red: "#ef4444",
  redDim: "#7f1d1d",
  yellow: "#eab308",
  blue: "#3b82f6",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const MAKERS = ["全メーカー", "Honda", "Yamaha", "Suzuki", "Kawasaki"]
const SOURCES: Source[] = ["ヤフオク", "BDS", "カチオク", "JBA", "手動"]
const CONDITIONS = ["A", "B", "C", "D"] as const

const fmt = (n: number) =>
  n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`

const condColor: Record<string, string> = {
  A: C.green,
  B: C.blue,
  C: C.yellow,
  D: C.red,
}
const trendIcon = (t: Trend, pct: number) => {
  if (t === "up") return { icon: "▲", color: C.green, label: `+${pct}%` }
  if (t === "down") return { icon: "▼", color: C.red, label: `${pct}%` }
  return { icon: "─", color: C.textMuted, label: `±${pct}%` }
}
const sourceColor: Record<Source, string> = {
  ヤフオク: C.orange,
  BDS: C.blue,
  カチオク: C.yellow,
  JBA: C.green,
  手動: C.textSub,
}

function PriceModal({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial?: Partial<MarketPrice>
}) {
  if (!open) return null
  const title = initial?.id ? "価格データ編集" : "価格データ追加"
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.borderLight}`,
          borderRadius: 12,
          padding: 32,
          width: 520,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontFamily: C.fontSans,
              fontWeight: 700,
              fontSize: 16,
              color: C.text,
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: C.textMuted,
              cursor: "pointer",
              fontSize: 20,
            }}
          >
            ×
          </button>
        </div>

        {(["maker", "model", "year"] as const).map((field) => (
          <div key={field} style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontFamily: C.font,
                fontSize: 11,
                color: C.textMuted,
                marginBottom: 6,
                letterSpacing: "0.08em",
              }}
            >
              {field === "maker"
                ? "メーカー"
                : field === "model"
                  ? "車種名"
                  : "年式"}
            </label>
            <input
              defaultValue={(initial as Record<string, unknown>)?.[field] ?? ""}
              style={{
                width: "100%",
                background: C.surfaceHigh,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "10px 14px",
                color: C.text,
                fontFamily: C.font,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder={
                field === "maker"
                  ? "Honda"
                  : field === "model"
                    ? "モンキー Z50M"
                    : "1970-1979"
              }
            />
          </div>
        ))}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          {(
            [
              "avg_price",
              "min_price",
              "max_price",
              "sample_count",
            ] as const
          ).map((f) => (
            <div key={f}>
              <label
                style={{
                  display: "block",
                  fontFamily: C.font,
                  fontSize: 11,
                  color: C.textMuted,
                  marginBottom: 6,
                  letterSpacing: "0.08em",
                }}
              >
                {f === "avg_price"
                  ? "平均価格"
                  : f === "min_price"
                    ? "最低価格"
                    : f === "max_price"
                      ? "最高価格"
                      : "サンプル数"}
              </label>
              <input
                type="number"
                defaultValue={(initial as Record<string, unknown>)?.[f] ?? ""}
                style={{
                  width: "100%",
                  background: C.surfaceHigh,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "10px 14px",
                  color: C.text,
                  fontFamily: C.font,
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontFamily: C.font,
                fontSize: 11,
                color: C.textMuted,
                marginBottom: 6,
                letterSpacing: "0.08em",
              }}
            >
              コンディション
            </label>
            <select
              style={{
                width: "100%",
                background: C.surfaceHigh,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "10px 14px",
                color: C.text,
                fontFamily: C.font,
                fontSize: 13,
                outline: "none",
              }}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}ランク
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontFamily: C.font,
                fontSize: 11,
                color: C.textMuted,
                marginBottom: 6,
                letterSpacing: "0.08em",
              }}
            >
              データソース
            </label>
            <select
              style={{
                width: "100%",
                background: C.surfaceHigh,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "10px 14px",
                color: C.text,
                fontFamily: C.font,
                fontSize: 13,
                outline: "none",
              }}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
              marginBottom: 6,
              letterSpacing: "0.08em",
            }}
          >
            メモ（任意）
          </label>
          <textarea
            defaultValue={initial?.memo ?? ""}
            rows={2}
            style={{
              width: "100%",
              background: C.surfaceHigh,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "10px 14px",
              color: C.text,
              fontFamily: C.font,
              fontSize: 13,
              outline: "none",
              resize: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.textSub,
              fontFamily: C.fontSans,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              background: C.orange,
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontFamily: C.fontSans,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export function MarketPricesContent() {
  const [data, setData] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [makerFilter, setMakerFilter] = useState("全メーカー")
  const [condFilter, setCondFilter] = useState<string>("all")
  const [srcFilter, setSrcFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<keyof MarketPrice>("avg_price")
  const [sortAsc, setSortAsc] = useState(false)
  const [modal, setModal] = useState<{
    open: boolean
    entry?: MarketPrice
  }>({ open: false })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getMarketPrices()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let d = data
    if (search) d = d.filter((r) => `${r.maker}${r.model}`.includes(search))
    if (makerFilter !== "全メーカー")
      d = d.filter((r) => r.maker === makerFilter)
    if (condFilter !== "all")
      d = d.filter((r) => r.condition === condFilter)
    if (srcFilter !== "all") d = d.filter((r) => r.source === srcFilter)
    return [...d].sort((a, b) => {
      const av = a[sortKey] as string | number
      const bv = b[sortKey] as string | number
      return sortAsc ? (av > bv ? 1 : -1) : av < bv ? 1 : -1
    })
  }, [data, search, makerFilter, condFilter, srcFilter, sortKey, sortAsc])

  const toggleSort = (k: keyof MarketPrice) => {
    if (sortKey === k) setSortAsc(!sortAsc)
    else {
      setSortKey(k)
      setSortAsc(false)
    }
  }

  const avgAll = Math.round(
    filtered.reduce((s, r) => s + r.avg_price, 0) / (filtered.length || 1)
  )

  const stats = [
    { label: "登録車種", value: `${filtered.length}件` },
    { label: "平均単価", value: fmt(avgAll) },
    {
      label: "上昇傾向",
      value: `${filtered.filter((r) => r.trend === "up").length}件`,
      color: C.green,
    },
    {
      label: "下降傾向",
      value: `${filtered.filter((r) => r.trend === "down").length}件`,
      color: C.red,
    },
  ]

  const thStyle = (k: keyof MarketPrice): CSSProperties => ({
    padding: "10px 14px",
    textAlign: "left",
    fontFamily: C.font,
    fontSize: 10,
    color: sortKey === k ? C.orange : C.textMuted,
    letterSpacing: "0.1em",
    cursor: "pointer",
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${C.border}`,
    userSelect: "none",
  })
  const tdStyle: CSSProperties = {
    padding: "12px 14px",
    borderBottom: `1px solid ${C.border}20`,
    verticalAlign: "middle",
  }

  if (loading) {
    return (
      <div
        style={{
          fontFamily: C.font,
          color: C.textMuted,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        読み込み中...
      </div>
    )
  }

  return (
    <div
      style={{
        fontFamily: C.font,
        color: C.text,
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: C.fontSans,
              fontWeight: 800,
              fontSize: 22,
              color: C.text,
              letterSpacing: "-0.02em",
            }}
          >
            市場価格マスター
          </h1>
          <span
            style={{
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
              letterSpacing: "0.1em",
            }}
          >
            MARKET_PRICES
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
          車種ごとの相場データを管理・参照。査定・入札上限算出のベースに使用します。
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontFamily: C.font,
                fontSize: 10,
                color: C.textMuted,
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: C.fontSans,
                fontWeight: 700,
                fontSize: 20,
                color: "color" in s ? (s as { color: string }).color : C.text,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 200px",
            minWidth: 180,
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: C.textMuted,
              fontSize: 14,
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="車種・メーカーで検索..."
            style={{
              width: "100%",
              background: C.surfaceHigh,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "9px 12px 9px 36px",
              color: C.text,
              fontFamily: C.font,
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {[
          {
            value: makerFilter,
            onChange: setMakerFilter,
            options: MAKERS.map((m) => ({ label: m, value: m })),
            placeholder: "全メーカー",
          },
        ].map((sel, i) => (
          <select
            key={i}
            value={sel.value}
            onChange={(e) => sel.onChange(e.target.value)}
            style={{
              background: C.surfaceHigh,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "9px 14px",
              color: C.text,
              fontFamily: C.font,
              fontSize: 12,
              outline: "none",
            }}
          >
            {sel.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}

        <select
          value={condFilter}
          onChange={(e) => setCondFilter(e.target.value)}
          style={{
            background: C.surfaceHigh,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "9px 14px",
            color: C.text,
            fontFamily: C.font,
            fontSize: 12,
            outline: "none",
          }}
        >
          <option value="all">全コンディション</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}ランク
            </option>
          ))}
        </select>

        <select
          value={srcFilter}
          onChange={(e) => setSrcFilter(e.target.value)}
          style={{
            background: C.surfaceHigh,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "9px 14px",
            color: C.text,
            fontFamily: C.font,
            fontSize: 12,
            outline: "none",
          }}
        >
          <option value="all">全ソース</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setModal({ open: true })}
            style={{
              padding: "9px 18px",
              background: C.orange,
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontFamily: C.fontSans,
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ＋ 追加
          </button>
          <button
            style={{
              padding: "9px 14px",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.textSub,
              fontFamily: C.fontSans,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            CSV書出
          </button>
        </div>
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
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 860,
            }}
          >
            <thead>
              <tr style={{ background: C.surfaceHigh }}>
                <th style={{ ...thStyle("maker"), width: 32 }}>
                  <input type="checkbox" style={{ accentColor: C.orange }} />
                </th>
                {(
                  [
                    ["maker", "メーカー"],
                    ["model", "車種"],
                    ["year", "年式"],
                    ["condition", "状態"],
                    ["source", "ソース"],
                    ["avg_price", "平均相場"],
                    ["min_price", "最低"],
                    ["max_price", "最高"],
                    ["sample_count", "件数"],
                    ["trend", "トレンド"],
                    ["updated_at", "更新日"],
                  ] as [keyof MarketPrice, string][]
                ).map(([k, label]) => (
                  <th
                    key={k}
                    style={thStyle(k)}
                    onClick={() => toggleSort(k)}
                  >
                    {label} {sortKey === k ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                ))}
                <th style={{ ...thStyle("id"), width: 80 }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const tr = trendIcon(r.trend, r.trend_pct)
                return (
                  <tr
                    key={r.id}
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
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        style={{ accentColor: C.orange }}
                        checked={selectedIds.has(r.id)}
                        onChange={() => {
                          const n = new Set(selectedIds)
                          n.has(r.id) ? n.delete(r.id) : n.add(r.id)
                          setSelectedIds(n)
                        }}
                      />
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: C.textSub,
                        fontSize: 12,
                      }}
                    >
                      {r.maker}
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          fontFamily: C.fontSans,
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {r.model}
                      </div>
                      {r.memo && (
                        <div
                          style={{
                            fontFamily: C.font,
                            fontSize: 10,
                            color: C.textMuted,
                            marginTop: 2,
                          }}
                        >
                          {r.memo}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: C.textSub,
                        fontSize: 12,
                      }}
                    >
                      {r.year}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: `${condColor[r.condition]}22`,
                          color: condColor[r.condition],
                          fontFamily: C.font,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {r.condition}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: `${sourceColor[r.source]}18`,
                          color: sourceColor[r.source],
                          fontFamily: C.font,
                          fontSize: 10,
                        }}
                      >
                        {r.source}
                      </span>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontFamily: C.fontSans,
                        fontWeight: 700,
                        fontSize: 14,
                        color: C.orange,
                      }}
                    >
                      {fmt(r.avg_price)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontFamily: C.font,
                        fontSize: 12,
                        color: C.textSub,
                      }}
                    >
                      {fmt(r.min_price)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontFamily: C.font,
                        fontSize: 12,
                        color: C.textSub,
                      }}
                    >
                      {fmt(r.max_price)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontFamily: C.font,
                        fontSize: 12,
                        color: C.textMuted,
                        textAlign: "center",
                      }}
                    >
                      {r.sample_count}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          color: tr.color,
                          fontFamily: C.font,
                          fontSize: 12,
                        }}
                      >
                        {tr.icon} {tr.label}
                      </span>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontFamily: C.font,
                        fontSize: 11,
                        color: C.textMuted,
                      }}
                    >
                      {r.updated_at}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() =>
                            setModal({ open: true, entry: r })
                          }
                          style={{
                            padding: "4px 10px",
                            background: "none",
                            border: `1px solid ${C.border}`,
                            borderRadius: 4,
                            color: C.textSub,
                            fontFamily: C.font,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          編集
                        </button>
                        <button
                          style={{
                            padding: "4px 10px",
                            background: "none",
                            border: `1px solid ${C.redDim}`,
                            borderRadius: 4,
                            color: C.red,
                            fontFamily: C.font,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={13}
                    style={{
                      padding: 48,
                      textAlign: "center",
                      color: C.textMuted,
                      fontFamily: C.font,
                      fontSize: 13,
                    }}
                  >
                    データが見つかりません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
            }}
          >
            {filtered.length} 件表示 / 全{data.length}件
            {selectedIds.size > 0 && ` · ${selectedIds.size}件選択中`}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {selectedIds.size > 0 && (
              <button
                style={{
                  padding: "6px 14px",
                  background: C.redDim,
                  border: `1px solid ${C.red}`,
                  borderRadius: 6,
                  color: C.red,
                  fontFamily: C.font,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                選択削除
              </button>
            )}
            <button
              onClick={() => {
                setSelectedIds(new Set())
                setSearch("")
                setMakerFilter("全メーカー")
                setCondFilter("all")
                setSrcFilter("all")
              }}
              style={{
                padding: "6px 14px",
                background: "none",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.textSub,
                fontFamily: C.font,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              リセット
            </button>
          </div>
        </div>
      </div>

      <PriceModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        initial={modal.entry}
      />
    </div>
  )
}
