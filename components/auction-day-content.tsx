"use client"

import { useState, useEffect, useCallback } from "react"
import {
  listBiddingEvaluations,
  updateBidDecision,
} from "@/app/actions/bidding"
import type { EvaluationRow, BidDecision } from "@/lib/db/types"

const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  border: "#2a2a2a",
  orange: "#f97316",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

type FilterType = "ALL" | "GO" | "NO GO" | "見送り" | "UNJUDGED"

type EvaluationWithVehicle = EvaluationRow & {
  vehicle?: {
    bds_rating: string | null
    chassis_number: string | null
    onsite_notes: string | null
  }
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `¥${Math.round(n).toLocaleString()}`

const fmt万 = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n / 1000) / 10}万`

export default function AuctionDayContent() {
  const [items, setItems] = useState<EvaluationWithVehicle[]>([])
  const [filter, setFilter] = useState<FilterType>("ALL")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [dateFilter, setDateFilter] = useState(today)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await listBiddingEvaluations(100)
    if (res.success) setItems(res.evaluations ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = items.filter((e) => {
    // 日付フィルタ
    if (dateFilter) {
      const created = new Date(e.created_at).toISOString().slice(0, 10)
      if (created !== dateFilter) return false
    }
    // 判定フィルタ
    if (filter === "ALL") return true
    if (filter === "UNJUDGED") return !e.bid_decision
    return e.bid_decision === filter
  })

  const counts = {
    all: items.filter((e) => !dateFilter || new Date(e.created_at).toISOString().slice(0, 10) === dateFilter).length,
    go: items.filter((e) => e.bid_decision === "GO" && (!dateFilter || new Date(e.created_at).toISOString().slice(0, 10) === dateFilter)).length,
    nogo: items.filter((e) => e.bid_decision === "NO GO" && (!dateFilter || new Date(e.created_at).toISOString().slice(0, 10) === dateFilter)).length,
    skip: items.filter((e) => e.bid_decision === "見送り" && (!dateFilter || new Date(e.created_at).toISOString().slice(0, 10) === dateFilter)).length,
    unjudged: items.filter((e) => !e.bid_decision && (!dateFilter || new Date(e.created_at).toISOString().slice(0, 10) === dateFilter)).length,
  }

  const handleDecision = async (id: string, decision: BidDecision) => {
    setUpdatingId(id)
    const res = await updateBidDecision(id, decision)
    if (res.success) {
      setItems((prev) =>
        prev.map((e) => (e.id === id ? { ...e, bid_decision: decision } : e))
      )
    }
    setUpdatingId(null)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: C.fontSans,
        padding: "16px 12px 80px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ marginBottom: 16 }}>
          <h1
            style={{
              fontFamily: C.font,
              fontSize: 24,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            オークション当日
          </h1>
          <p style={{ color: C.textSub, fontSize: 12, marginTop: 4 }}>
            {filtered.length} 台 / 判定: GO {counts.go} · NO {counts.nogo} · 見送り {counts.skip} · 未判定 {counts.unjudged}
          </p>
        </header>

        {/* 日付選択 */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "8px 10px",
              color: C.text,
              fontFamily: C.font,
              fontSize: 12,
            }}
          />
          <button
            onClick={() => setDateFilter("")}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "8px 12px",
              color: C.textSub,
              fontFamily: C.font,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            全期間
          </button>
          <button
            onClick={refresh}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "8px 12px",
              color: C.textSub,
              fontFamily: C.font,
              fontSize: 11,
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            ↻
          </button>
        </div>

        {/* フィルタタブ */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 16,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <FilterTab
            active={filter === "ALL"}
            label={`ALL ${counts.all}`}
            onClick={() => setFilter("ALL")}
          />
          <FilterTab
            active={filter === "UNJUDGED"}
            label={`未判定 ${counts.unjudged}`}
            color={C.yellow}
            onClick={() => setFilter("UNJUDGED")}
          />
          <FilterTab
            active={filter === "GO"}
            label={`GO ${counts.go}`}
            color={C.green}
            onClick={() => setFilter("GO")}
          />
          <FilterTab
            active={filter === "NO GO"}
            label={`NO GO ${counts.nogo}`}
            color={C.red}
            onClick={() => setFilter("NO GO")}
          />
          <FilterTab
            active={filter === "見送り"}
            label={`見送り ${counts.skip}`}
            color={C.textMuted}
            onClick={() => setFilter("見送り")}
          />
        </div>

        {/* カード一覧 */}
        {loading ? (
          <div style={{ color: C.textSub, fontSize: 13, textAlign: "center", padding: 40 }}>
            読み込み中...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              color: C.textMuted,
              fontSize: 13,
              textAlign: "center",
              padding: 40,
            }}
          >
            該当する車両はありません
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((e) => (
              <Card
                key={e.id}
                evaluation={e}
                updating={updatingId === e.id}
                onDecision={(d) => handleDecision(e.id, d)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({
  evaluation: e,
  updating,
  onDecision,
}: {
  evaluation: EvaluationWithVehicle
  updating: boolean
  onDecision: (d: BidDecision) => void
}) {
  const isGO = e.bid_decision === "GO"
  const isNoGo = e.bid_decision === "NO GO"
  const isSkip = e.bid_decision === "見送り"
  const borderColor = isGO
    ? C.green
    : isNoGo
    ? C.red
    : isSkip
    ? C.textMuted
    : C.border

  return (
    <div
      style={{
        background: C.surface,
        border: `2px solid ${borderColor}`,
        borderRadius: 12,
        padding: 14,
        opacity: updating ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: C.font,
              fontSize: 11,
              color: C.textSub,
              marginBottom: 2,
            }}
          >
            {e.vehicle_category ?? "未分類"} · ランク{e.condition_rank ?? "—"}
            {e.vehicle?.bds_rating && ` · BDS ${e.vehicle.bds_rating}`}
          </div>
          {e.vehicle?.onsite_notes && (
            <div
              style={{
                fontSize: 13,
                color: C.text,
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {e.vehicle.onsite_notes}
            </div>
          )}
        </div>
      </div>

      {/* 入札上限（でかく） */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          padding: 12,
          background: C.surfaceHigh,
          borderRadius: 8,
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: C.font,
              fontSize: 9,
              color: C.textSub,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            上限 (利益5万)
          </div>
          <div
            style={{
              fontFamily: C.font,
              fontSize: 24,
              fontWeight: 700,
              color: C.green,
              lineHeight: 1.1,
              marginTop: 2,
            }}
          >
            {fmt(e.bid_limit_best)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: C.font,
              fontSize: 9,
              color: C.textSub,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            上限 (利益2万)
          </div>
          <div
            style={{
              fontFamily: C.font,
              fontSize: 24,
              fontWeight: 700,
              color: C.yellow,
              lineHeight: 1.1,
              marginTop: 2,
            }}
          >
            {fmt(e.bid_limit_min)}
          </div>
        </div>
      </div>

      {/* 試算詳細 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          fontFamily: C.font,
          fontSize: 11,
          color: C.textSub,
          marginBottom: 10,
        }}
      >
        <span>売価 {fmt万(e.estimated_sale_price)}</span>
        <span>整備 {fmt万(e.repair_cost_estimate)}</span>
        <span>陸送 {fmt万(e.transport_cost)}</span>
      </div>

      {/* 判定ボタン */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <DecisionBtn
          label="GO"
          active={isGO}
          color={C.green}
          disabled={updating}
          onClick={() => onDecision("GO")}
        />
        <DecisionBtn
          label="NO GO"
          active={isNoGo}
          color={C.red}
          disabled={updating}
          onClick={() => onDecision("NO GO")}
        />
        <DecisionBtn
          label="見送り"
          active={isSkip}
          color={C.textMuted}
          disabled={updating}
          onClick={() => onDecision("見送り")}
        />
      </div>

      {e.decision_reason && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: C.textSub,
            paddingTop: 8,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          理由: {e.decision_reason}
        </div>
      )}
    </div>
  )
}

function DecisionBtn({
  label,
  active,
  color,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  color: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 8px",
        borderRadius: 8,
        border: `1px solid ${active ? color : C.border}`,
        background: active ? color : "transparent",
        color: active ? "#000" : color,
        fontFamily: C.font,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.05em",
        cursor: disabled ? "wait" : "pointer",
      }}
    >
      {label}
    </button>
  )
}

function FilterTab({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean
  label: string
  color?: string
  onClick: () => void
}) {
  const accent = color ?? C.orange
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 20,
        border: `1px solid ${active ? accent : C.border}`,
        background: active ? accent : "transparent",
        color: active ? "#000" : C.textSub,
        fontFamily: C.font,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  )
}
