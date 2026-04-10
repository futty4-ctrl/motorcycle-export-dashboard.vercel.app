"use client"

import { useCallback, useEffect, useState } from "react"
import type {
  AuctionHistoryRecord,
  AuctionHistoryFilter,
  AuctionHistorySummary,
} from "@/types/auction-history"
import {
  getAuctionHistory,
  getAuctionHistorySummary,
  getDistinctRegions,
} from "@/app/actions/auction-history"
import { C } from "@/components/ui-system"
import { AuctionSummary } from "./components/AuctionSummary"
import { AuctionFilters } from "./components/AuctionFilters"
import { AuctionTable } from "./components/AuctionTable"
import { AuctionCharts } from "./components/AuctionCharts"
import { AuctionDetailModal } from "./components/AuctionDetailModal"

type Tab = "list" | "charts"

export default function AuctionHistoryPage() {
  const [rows, setRows] = useState<AuctionHistoryRecord[]>([])
  const [summary, setSummary] = useState<AuctionHistorySummary | null>(null)
  const [regions, setRegions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AuctionHistoryFilter>({})
  const [tab, setTab] = useState<Tab>("list")
  const [selected, setSelected] = useState<AuctionHistoryRecord | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [listRes, sumRes] = await Promise.all([
      getAuctionHistory(filter),
      getAuctionHistorySummary(),
    ])
    if (listRes.success && listRes.rows) setRows(listRes.rows)
    else if (listRes.error) setError(listRes.error)
    if (sumRes.success && sumRes.summary) setSummary(sumRes.summary)
    setLoading(false)
  }, [filter])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    getDistinctRegions().then((r) => {
      if (r.success && r.regions) setRegions(r.regions)
    })
  }, [])

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: 22,
              color: "#f5f5f5",
              letterSpacing: "-0.02em",
            }}
          >
            オークション履歴
          </h1>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "#525252",
              letterSpacing: "0.1em",
            }}
          >
            AUCTION HISTORY
          </span>
        </div>
        <p
          style={{
            margin: "6px 0 0",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "#a3a3a3",
          }}
        >
          Chrome拡張から取り込んだBDS落札結果の一覧・分析・個別メモ管理
        </p>
      </div>

      <AuctionSummary summary={summary} loading={loading} />

      <AuctionFilters filter={filter} onChange={setFilter} regions={regions} />

      {/* タブ */}
      <div
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 20,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {(
          [
            { key: "list", label: "一覧" },
            { key: "charts", label: "分析" },
          ] as { key: Tab; label: string }[]
        ).map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: "12px 24px",
                background: "none",
                border: "none",
                borderBottom: active ? `2px solid ${C.orange}` : "2px solid transparent",
                color: active ? C.orange : C.textSub,
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 13,
                letterSpacing: 0.5,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div
          style={{
            padding: 14,
            background: `${C.red}10`,
            border: `1px solid ${C.red}40`,
            borderRadius: 8,
            color: C.red,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {tab === "list" && <AuctionTable rows={rows} onRowClick={setSelected} />}
      {tab === "charts" && <AuctionCharts rows={rows} />}

      <AuctionDetailModal
        record={selected}
        onClose={() => setSelected(null)}
        onUpdated={loadData}
      />
    </div>
  )
}
