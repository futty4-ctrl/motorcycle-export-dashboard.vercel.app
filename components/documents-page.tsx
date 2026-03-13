"use client"

import { useState, useMemo } from "react"
import type { CSSProperties } from "react"

const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  borderLight: "#333333",
  orange: "#f97316",
  orangeDim: "#7c3a10",
  orangeGlow: "rgba(249,115,22,0.12)",
  green: "#22c55e",
  greenDim: "#14532d",
  red: "#ef4444",
  redDim: "#7f1d1d",
  yellow: "#eab308",
  blue: "#3b82f6",
  blueDim: "#1e3a5f",
  purple: "#a855f7",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

// ── Types ──────────────────────────────────────────────────────────────────
type DocType = "invoice" | "quote" | "report" | "checklist" | "other"
type DocStatus = "draft" | "sent" | "confirmed" | "archived"

interface Doc {
  id: string
  title: string
  type: DocType
  status: DocStatus
  vehicle?: string
  amount?: number
  createdAt: string
  updatedAt: string
  tags: string[]
}

// ── Mock data ───────────────────────────────────────────────────────────────
const MOCK_DOCS: Doc[] = [
  { id: "1", title: "モンキー Z50M 買取査定書", type: "quote", status: "sent", vehicle: "モンキー Z50M", amount: 185000, createdAt: "2026-03-13", updatedAt: "2026-03-13", tags: ["4ミニ", "BDS"] },
  { id: "2", title: "ゴリラ Z50J 仕入れ見積", type: "quote", status: "draft", vehicle: "ゴリラ Z50J", amount: 210000, createdAt: "2026-03-12", updatedAt: "2026-03-13", tags: ["4ミニ"] },
  { id: "3", title: "2026年3月 月次売上レポート", type: "report", status: "draft", amount: undefined, createdAt: "2026-03-01", updatedAt: "2026-03-13", tags: ["月次", "GAMI"] },
  { id: "4", title: "ダックス ST70 輸出Invoice", type: "invoice", status: "confirmed", vehicle: "ダックス ST70", amount: 250000, createdAt: "2026-03-10", updatedAt: "2026-03-11", tags: ["輸出", "eBay"] },
  { id: "5", title: "仕入れ前チェックリスト v2", type: "checklist", status: "confirmed", createdAt: "2026-03-05", updatedAt: "2026-03-05", tags: ["テンプレ"] },
  { id: "6", title: "カブ C50 買取査定書", type: "quote", status: "archived", vehicle: "カブ C50", amount: 78000, createdAt: "2026-02-28", updatedAt: "2026-02-28", tags: ["カブ系"] },
  { id: "7", title: "物流提案書 RK商事様", type: "other", status: "sent", amount: undefined, createdAt: "2026-03-08", updatedAt: "2026-03-09", tags: ["物流", "GAMI"] },
  { id: "8", title: "シャリー CF50 ヤフオク出品用Invoice", type: "invoice", status: "sent", vehicle: "シャリー CF50", amount: 88000, createdAt: "2026-03-11", updatedAt: "2026-03-12", tags: ["ヤフオク"] },
  { id: "9", title: "2026年2月 月次売上レポート", type: "report", status: "archived", createdAt: "2026-02-01", updatedAt: "2026-03-01", tags: ["月次", "GAMI"] },
  { id: "10", title: "eBay出品チェックリスト", type: "checklist", status: "confirmed", createdAt: "2026-02-20", updatedAt: "2026-02-20", tags: ["テンプレ", "輸出"] },
]

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`

const typeLabel: Record<DocType, string> = {
  invoice: "Invoice",
  quote: "査定・見積",
  report: "レポート",
  checklist: "チェックリスト",
  other: "その他",
}
const typeIcon: Record<DocType, string> = {
  invoice: "🧾",
  quote: "📋",
  report: "📊",
  checklist: "✅",
  other: "📄",
}
const typeColor: Record<DocType, string> = {
  invoice: C.orange,
  quote: C.blue,
  report: C.purple,
  checklist: C.green,
  other: C.textSub,
}
const statusLabel: Record<DocStatus, string> = {
  draft: "下書き",
  sent: "送付済",
  confirmed: "確認済",
  archived: "アーカイブ",
}
const statusColor: Record<DocStatus, string> = {
  draft: C.yellow,
  sent: C.blue,
  confirmed: C.green,
  archived: C.textMuted,
}

// ── New Document Modal ──────────────────────────────────────────────────────
function NewDocModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [docType, setDocType] = useState<DocType>("quote")
  if (!open) return null
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
          width: 480,
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
            新規ドキュメント
          </span>
          <button
            type="button"
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

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
              marginBottom: 10,
              letterSpacing: "0.08em",
            }}
          >
            種類
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 8,
            }}
          >
            {(Object.keys(typeLabel) as DocType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDocType(t)}
                style={{
                  padding: "12px 8px",
                  borderRadius: 8,
                  background:
                    docType === t ? `${typeColor[t]}18` : C.surfaceHigh,
                  border: `1px solid ${docType === t ? typeColor[t] : C.border}`,
                  color: docType === t ? typeColor[t] : C.textSub,
                  fontFamily: C.fontSans,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 18 }}>{typeIcon[t]}</span>
                {typeLabel[t]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
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
            タイトル
          </label>
          <input
            placeholder={`例：${docType === "quote" ? "モンキー Z50M 買取査定書" : docType === "invoice" ? "ダックス ST70 輸出Invoice" : "2026年3月 月次レポート"}`}
            style={{
              width: "100%",
              background: C.surfaceHigh,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "10px 14px",
              color: C.text,
              fontFamily: C.fontSans,
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {(docType === "quote" || docType === "invoice") && (
          <div style={{ marginBottom: 16 }}>
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
              車種（任意）
            </label>
            <input
              placeholder="例：モンキー Z50M"
              style={{
                width: "100%",
                background: C.surfaceHigh,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "10px 14px",
                color: C.text,
                fontFamily: C.fontSans,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

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
            タグ（カンマ区切り）
          </label>
          <input
            placeholder="例：4ミニ, BDS, 輸出"
            style={{
              width: "100%",
              background: C.surfaceHigh,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "10px 14px",
              color: C.text,
              fontFamily: C.fontSans,
              fontSize: 13,
              outline: "none",
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
            type="button"
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
            type="button"
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
            作成
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Doc Card ────────────────────────────────────────────────────────────────
function DocCard({ doc }: { doc: Doc }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? C.surfaceHover : C.surface,
        border: `1px solid ${hover ? C.borderLight : C.border}`,
        borderRadius: 10,
        padding: "18px 20px",
        cursor: "pointer",
        transition: "all 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 3,
          height: "100%",
          background: typeColor[doc.type],
          borderRadius: "10px 0 0 10px",
        }}
      />

      <div style={{ paddingLeft: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{typeIcon[doc.type]}</span>
            <span
              style={{
                fontFamily: C.font,
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 4,
                background: `${typeColor[doc.type]}18`,
                color: typeColor[doc.type],
              }}
            >
              {typeLabel[doc.type]}
            </span>
          </div>
          <span
            style={{
              fontFamily: C.font,
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              background: `${statusColor[doc.status]}18`,
              color: statusColor[doc.status],
            }}
          >
            {statusLabel[doc.status]}
          </span>
        </div>

        <div
          style={{
            fontFamily: C.fontSans,
            fontWeight: 600,
            fontSize: 14,
            color: C.text,
            marginBottom: 6,
            lineHeight: 1.4,
          }}
        >
          {doc.title}
        </div>

        <div
          style={{ display: "flex", gap: 16, marginBottom: 10 }}
        >
          {doc.vehicle && (
            <span
              style={{
                fontFamily: C.font,
                fontSize: 11,
                color: C.textSub,
              }}
            >
              🏍 {doc.vehicle}
            </span>
          )}
          {doc.amount !== undefined && (
            <span
              style={{
                fontFamily: C.fontSans,
                fontWeight: 700,
                fontSize: 13,
                color: C.orange,
              }}
            >
              {fmt(doc.amount)}
            </span>
          )}
        </div>

        {doc.tags.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            {doc.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: C.font,
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: C.surfaceHigh,
                  color: C.textMuted,
                  border: `1px solid ${C.border}`,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: C.font,
              fontSize: 10,
              color: C.textMuted,
            }}
          >
            {doc.updatedAt} 更新
          </span>
          <div
            style={{
              display: "flex",
              gap: 6,
              opacity: hover ? 1 : 0,
              transition: "opacity 0.15s",
            }}
          >
            {["表示", "編集", "複製"].map((a) => (
              <button
                key={a}
                type="button"
                style={{
                  padding: "4px 10px",
                  background: C.surfaceHigh,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  color: C.textSub,
                  fontFamily: C.font,
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
const VIEW_MODES = ["grid", "list"] as const
type ViewMode = (typeof VIEW_MODES)[number]

export function DocumentsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<DocType | "all">("all")
  const [statFilter, setStatFilter] = useState<DocStatus | "all">("all")
  const [view, setView] = useState<ViewMode>("grid")
  const [modal, setModal] = useState(false)

  const filtered = useMemo(() => {
    let d = MOCK_DOCS
    if (search)
      d = d.filter(
        (r) =>
          r.title.includes(search) ||
          r.tags.some((t) => t.includes(search))
      )
    if (typeFilter !== "all") d = d.filter((r) => r.type === typeFilter)
    if (statFilter !== "all") d = d.filter((r) => r.status === statFilter)
    return d.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [search, typeFilter, statFilter])

  const counts = {
    total: MOCK_DOCS.length,
    draft: MOCK_DOCS.filter((d) => d.status === "draft").length,
    sent: MOCK_DOCS.filter((d) => d.status === "sent").length,
    total_amt: MOCK_DOCS.filter((d) => d.amount).reduce(
      (s, d) => s + (d.amount ?? 0),
      0
    ),
  }

  const tdStyle: CSSProperties = {
    padding: "12px 16px",
    borderBottom: `1px solid ${C.border}20`,
    verticalAlign: "middle",
    fontFamily: C.fontSans,
    fontSize: 13,
    color: C.text,
  }

  return (
    <div style={{ fontFamily: C.font, color: C.text }}>
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
            ドキュメント
          </h1>
          <span
            style={{
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
              letterSpacing: "0.1em",
            }}
          >
            DOCUMENTS
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
          査定書・Invoice・レポート・チェックリストを一元管理します。
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
        {[
          {
            label: "総ドキュメント",
            value: `${counts.total}件`,
            color: C.text,
          },
          { label: "下書き", value: `${counts.draft}件`, color: C.yellow },
          { label: "送付済", value: `${counts.sent}件`, color: C.blue },
          {
            label: "合計金額",
            value: fmt(counts.total_amt),
            color: C.orange,
          },
        ].map((s) => (
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
                color: s.color,
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
          padding: "14px 20px",
          marginBottom: 16,
          display: "flex",
          gap: 10,
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
              fontSize: 13,
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タイトル・タグで検索..."
            style={{
              width: "100%",
              background: C.surfaceHigh,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "9px 12px 9px 34px",
              color: C.text,
              fontFamily: C.font,
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as DocType | "all")
          }
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
          <option value="all">全種類</option>
          {(Object.keys(typeLabel) as DocType[]).map((t) => (
            <option key={t} value={t}>
              {typeIcon[t]} {typeLabel[t]}
            </option>
          ))}
        </select>

        <select
          value={statFilter}
          onChange={(e) =>
            setStatFilter(e.target.value as DocStatus | "all")
          }
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
          <option value="all">全ステータス</option>
          {(Object.keys(statusLabel) as DocStatus[]).map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </select>

        <div
          style={{
            display: "flex",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {(["grid", "list"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                padding: "8px 14px",
                background: view === v ? C.surfaceHigh : "none",
                border: "none",
                color: view === v ? C.text : C.textMuted,
                fontFamily: C.font,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {v === "grid" ? "⊞ グリッド" : "☰ リスト"}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setModal(true)}
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
            ＋ 新規作成
          </button>
          <button
            type="button"
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
            一括エクスポート
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {filtered.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                gridColumn: "1/-1",
                padding: 64,
                textAlign: "center",
                color: C.textMuted,
                fontFamily: C.font,
                fontSize: 13,
              }}
            >
              ドキュメントが見つかりません
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.surfaceHigh }}>
                {[
                  "種類",
                  "タイトル",
                  "ステータス",
                  "金額",
                  "タグ",
                  "更新日",
                  "操作",
                ].map((h) => (
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
              {filtered.map((doc, i) => (
                <tr
                  key={doc.id}
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
                    <span
                      style={{
                        fontFamily: C.font,
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: `${typeColor[doc.type]}18`,
                        color: typeColor[doc.type],
                      }}
                    >
                      {typeIcon[doc.type]} {typeLabel[doc.type]}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        fontFamily: C.fontSans,
                        fontWeight: 500,
                      }}
                    >
                      {doc.title}
                    </div>
                    {doc.vehicle && (
                      <div
                        style={{
                          fontFamily: C.font,
                          fontSize: 11,
                          color: C.textMuted,
                          marginTop: 2,
                        }}
                      >
                        🏍 {doc.vehicle}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontFamily: C.font,
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: `${statusColor[doc.status]}18`,
                        color: statusColor[doc.status],
                      }}
                    >
                      {statusLabel[doc.status]}
                    </span>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: C.fontSans,
                      fontWeight: 700,
                      color: C.orange,
                    }}
                  >
                    {doc.amount !== undefined ? fmt(doc.amount) : "─"}
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontFamily: C.font,
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: C.surfaceHigh,
                            color: C.textMuted,
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: C.font,
                      fontSize: 11,
                      color: C.textMuted,
                    }}
                  >
                    {doc.updatedAt}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["表示", "編集"].map((a) => (
                        <button
                          key={a}
                          type="button"
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
                          {a}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 48,
                      textAlign: "center",
                      color: C.textMuted,
                      fontFamily: C.font,
                      fontSize: 13,
                    }}
                  >
                    ドキュメントが見つかりません
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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
              {filtered.length} 件表示 / 全{MOCK_DOCS.length}件
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setTypeFilter("all")
                setStatFilter("all")
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
      )}

      <NewDocModal open={modal} onClose={() => setModal(false)} />
    </div>
  )
}
