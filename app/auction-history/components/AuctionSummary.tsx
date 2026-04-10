"use client"

import type { AuctionHistorySummary } from "@/types/auction-history"
import { C, kpiCard } from "@/components/ui-system"

interface Props {
  summary: AuctionHistorySummary | null
  loading: boolean
}

function formatYen(n: number): string {
  if (n >= 10_000) return `¥${(n / 10_000).toFixed(1)}万`
  return `¥${n.toLocaleString()}`
}

export function AuctionSummary({ summary, loading }: Props) {
  const cards = [
    {
      label: "総記録数",
      value: summary ? summary.total.toLocaleString() : "-",
      suffix: "件",
      color: C.blue,
    },
    {
      label: "今月の記録",
      value: summary ? summary.thisMonth.toLocaleString() : "-",
      suffix: "件",
      color: C.orange,
    },
    {
      label: "落札率",
      value: summary ? `${(summary.soldRate * 100).toFixed(1)}` : "-",
      suffix: "%",
      color: C.green,
    },
    {
      label: "平均落札価格",
      value: summary ? formatYen(summary.avgSoldPrice) : "-",
      suffix: "",
      color: C.yellow,
    },
  ]

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
        marginBottom: 24,
      }}
    >
      {cards.map((card) => (
        <div key={card.label} style={kpiCard(card.color)}>
          <div
            style={{
              fontSize: 10,
              color: C.textMuted,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: loading ? C.textMuted : C.text,
              letterSpacing: -0.5,
            }}
          >
            {loading ? "…" : card.value}
            {!loading && card.suffix && (
              <span
                style={{
                  fontSize: 12,
                  color: C.textSub,
                  fontWeight: "normal",
                  marginLeft: 4,
                }}
              >
                {card.suffix}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
