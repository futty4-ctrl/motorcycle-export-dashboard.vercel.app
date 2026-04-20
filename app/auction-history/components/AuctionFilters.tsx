"use client"

import type { AuctionHistoryFilter } from "@/types/auction-history"
import { C, inp, lbl } from "@/components/ui-system"

interface Props {
  filter: AuctionHistoryFilter
  onChange: (filter: AuctionHistoryFilter) => void
  regions: string[]
}

export function AuctionFilters({ filter, onChange, regions }: Props) {
  const set = <K extends keyof AuctionHistoryFilter>(
    key: K,
    value: AuctionHistoryFilter[K]
  ) => {
    onChange({ ...filter, [key]: value })
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 12,
      }}
    >
      <div>
        <div style={lbl}>車種検索</div>
        <input
          style={inp}
          value={filter.search || ""}
          onChange={(e) => set("search", e.target.value)}
          placeholder="モンキー"
        />
      </div>
      <div>
        <div style={lbl}>種別</div>
        <select
          style={{ ...inp, cursor: "pointer" }}
          value={filter.recordType || "all"}
          onChange={(e) => set("recordType", e.target.value as AuctionHistoryFilter["recordType"])}
        >
          <option value="all">全て</option>
          <option value="evaluation">査定</option>
          <option value="history">履歴</option>
        </select>
      </div>
      <div>
        <div style={lbl}>結果</div>
        <select
          style={{ ...inp, cursor: "pointer" }}
          value={filter.resultStatus || "all"}
          onChange={(e) =>
            set("resultStatus", e.target.value as AuctionHistoryFilter["resultStatus"])
          }
        >
          <option value="all">全て</option>
          <option value="sold">落札</option>
          <option value="unsold">流札</option>
          <option value="unknown">不明</option>
        </select>
      </div>
      <div>
        <div style={lbl}>排気量</div>
        <select
          style={{ ...inp, cursor: "pointer" }}
          value={filter.ccRange || "all"}
          onChange={(e) => set("ccRange", e.target.value as AuctionHistoryFilter["ccRange"])}
        >
          <option value="all">全て</option>
          <option value="small">〜125cc</option>
          <option value="mid">126〜400cc</option>
          <option value="large">401cc〜</option>
        </select>
      </div>
      <div>
        <div style={lbl}>会場</div>
        <select
          style={{ ...inp, cursor: "pointer" }}
          value={filter.auctionTypeKind || "all"}
          onChange={(e) =>
            set(
              "auctionTypeKind",
              e.target.value as AuctionHistoryFilter["auctionTypeKind"]
            )
          }
        >
          <option value="all">全て</option>
          <option value="蚤の市">蚤の市</option>
          <option value="定例">定例</option>
        </select>
      </div>
      <div>
        <div style={lbl}>地域</div>
        <select
          style={{ ...inp, cursor: "pointer" }}
          value={filter.region || "all"}
          onChange={(e) => set("region", e.target.value)}
        >
          <option value="all">全て</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div>
          <div style={lbl}>期間（開始）</div>
          <input
            style={inp}
            type="date"
            value={filter.dateFrom || ""}
            onChange={(e) => set("dateFrom", e.target.value)}
          />
        </div>
        <div>
          <div style={lbl}>期間（終了）</div>
          <input
            style={inp}
            type="date"
            value={filter.dateTo || ""}
            onChange={(e) => set("dateTo", e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
