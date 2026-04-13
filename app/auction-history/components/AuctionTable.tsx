"use client"

import { useMemo, useState } from "react"
import type { AuctionHistoryRecord, AuctionTypeKind } from "@/types/auction-history"
import { C, badge, table, th, td } from "@/components/ui-system"
import { estimatedProfit, isBuyCandidate } from "@/lib/auction-profit"

interface Props {
  rows: AuctionHistoryRecord[]
  onRowClick: (row: AuctionHistoryRecord) => void
}

type SortKey =
  | "auction_date"
  | "bds_lot_number"
  | "model_name"
  | "mileage_km"
  | "start_price"
  | "sold_price"
  | "estimated_profit"
  | "result_status"
  | "region"

type SubTab = "all" | "蚤の市" | "定例"

const PAGE_SIZE = 20

function formatPrice(n: number | null): string {
  if (!n) return "-"
  return `¥${n.toLocaleString()}`
}

function formatMileage(km: number | null): string {
  if (!km) return "-"
  if (km >= 1000) return `${(km / 1000).toFixed(1)}K`
  return `${km}`
}

function resultBadge(status: AuctionHistoryRecord["result_status"]) {
  if (status === "sold") return <span style={badge(C.green)}>落札</span>
  if (status === "unsold") return <span style={badge(C.red)}>流札</span>
  return <span style={badge(C.textMuted)}>-</span>
}

function typeBadge(type: AuctionHistoryRecord["record_type"]) {
  if (type === "evaluation") return <span style={badge(C.orange)}>査定</span>
  return <span style={badge(C.textSub)}>履歴</span>
}

export function AuctionTable({ rows, onRowClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("auction_date")
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)
  const [subTab, setSubTab] = useState<SubTab>("all")
  const [candidateOnly, setCandidateOnly] = useState(false)

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (subTab !== "all" && r.auction_type !== (subTab as AuctionTypeKind)) return false
      if (candidateOnly && !isBuyCandidate(r)) return false
      return true
    })
  }, [rows, subTab, candidateOnly])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = sortKey === "estimated_profit" ? estimatedProfit(a) : a[sortKey]
      const bv = sortKey === "estimated_profit" ? estimatedProfit(b) : b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av
      }
      const as = String(av)
      const bs = String(bv)
      return sortAsc ? as.localeCompare(bs) : bs.localeCompare(as)
    })
    return copy
  }, [filtered, sortKey, sortAsc])

  const candidateCount = useMemo(
    () => filtered.filter((r) => isBuyCandidate(r)).length,
    [filtered]
  )

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
    setPage(0)
  }

  const headerCell = (key: SortKey, label: string, align?: "right") => (
    <th
      style={{
        ...th,
        cursor: "pointer",
        userSelect: "none",
        textAlign: align || "left",
      }}
      onClick={() => handleSort(key)}
    >
      {label} {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  )

  const subTabs: { key: SubTab; label: string }[] = [
    { key: "all", label: "全て" },
    { key: "蚤の市", label: "蚤の市" },
    { key: "定例", label: "定例" },
  ]

  return (
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: `1px solid ${C.border}`,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {subTabs.map((t) => {
            const active = subTab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setSubTab(t.key)
                  setPage(0)
                }}
                style={{
                  padding: "6px 14px",
                  background: active ? C.orange : "transparent",
                  border: `1px solid ${active ? C.orange : C.border}`,
                  color: active ? "#000" : C.textSub,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: C.textSub,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={candidateOnly}
            onChange={(e) => {
              setCandidateOnly(e.target.checked)
              setPage(0)
            }}
          />
          仕入候補のみ（≤15万 & 予測利益≥3万）
          <span style={{ color: C.orange, fontFamily: "monospace" }}>
            {candidateCount}件
          </span>
        </label>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              {headerCell("auction_date", "日付")}
              {headerCell("bds_lot_number", "Lot#")}
              {headerCell("model_name", "車種")}
              {headerCell("mileage_km", "走行", "right")}
              {headerCell("start_price", "開始", "right")}
              {headerCell("sold_price", "落札", "right")}
              {headerCell("estimated_profit", "予測利益", "right")}
              {headerCell("result_status", "結果")}
              <th style={th}>種別</th>
              {headerCell("region", "地域")}
              <th style={th}>会場</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  style={{ ...td, textAlign: "center", padding: 40, color: C.textMuted }}
                >
                  データがありません
                </td>
              </tr>
            ) : (
              pageRows.map((r) => {
                const profit = estimatedProfit(r)
                const candidate = isBuyCandidate(r)
                const baseBg = candidate ? "rgba(34,197,94,0.08)" : "transparent"
                return (
                <tr
                  key={r.id}
                  style={{
                    cursor: "pointer",
                    transition: "background 0.1s",
                    background: baseBg,
                    borderLeft: candidate ? `3px solid ${C.green}` : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background =
                      "rgba(245,114,10,0.08)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background = baseBg
                  }}
                  onClick={() => onRowClick(r)}
                >
                  <td style={td}>{r.auction_date || "-"}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>
                    {r.bds_lot_number || "-"}
                  </td>
                  <td style={{ ...td, fontWeight: "bold" }}>{r.model_name || "-"}</td>
                  <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>
                    {formatMileage(r.mileage_km)}
                  </td>
                  <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>
                    {formatPrice(r.start_price)}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: r.sold_price ? C.green : C.textMuted,
                      fontWeight: r.sold_price ? "bold" : "normal",
                    }}
                  >
                    {formatPrice(r.sold_price)}
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                      fontFamily: "monospace",
                      color:
                        profit == null
                          ? C.textMuted
                          : profit >= 30000
                            ? C.green
                            : profit >= 0
                              ? C.textSub
                              : C.red,
                      fontWeight: profit != null && profit >= 30000 ? "bold" : "normal",
                    }}
                  >
                    {profit == null ? "-" : formatPrice(profit)}
                  </td>
                  <td style={td}>{resultBadge(r.result_status)}</td>
                  <td style={td}>{typeBadge(r.record_type)}</td>
                  <td style={td}>{r.region || "-"}</td>
                  <td style={td}>{r.auction_type || "-"}</td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > PAGE_SIZE && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderTop: `1px solid ${C.border}`,
            fontSize: 12,
            color: C.textSub,
          }}
        >
          <div>
            {current * PAGE_SIZE + 1} - {Math.min((current + 1) * PAGE_SIZE, sorted.length)}{" "}
            / {sorted.length}件
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
              style={{
                padding: "6px 12px",
                background: "none",
                border: `1px solid ${C.border}`,
                color: current === 0 ? C.textMuted : C.text,
                borderRadius: 4,
                cursor: current === 0 ? "not-allowed" : "pointer",
                fontSize: 12,
              }}
            >
              前へ
            </button>
            <div style={{ padding: "6px 12px", color: C.text }}>
              {current + 1} / {pageCount}
            </div>
            <button
              type="button"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
              style={{
                padding: "6px 12px",
                background: "none",
                border: `1px solid ${C.border}`,
                color: current >= pageCount - 1 ? C.textMuted : C.text,
                borderRadius: 4,
                cursor: current >= pageCount - 1 ? "not-allowed" : "pointer",
                fontSize: 12,
              }}
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
