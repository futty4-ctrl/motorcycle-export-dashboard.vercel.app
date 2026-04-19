"use client"

import { useState } from "react"
import { MonthlyProgressContent } from "@/components/monthly-progress-content"
import PerformanceContent from "@/components/performance-content"
import BiddingAnalyticsContent from "@/components/bidding-analytics-content"
import { ProfitForecastContent } from "@/components/profit-forecast-content"
import { CashflowContent } from "@/components/cashflow-content"

type Tab =
  | "monthly"
  | "performance"
  | "bidding"
  | "forecast"
  | "cashflow"

const TABS: { key: Tab; label: string }[] = [
  { key: "monthly", label: "月次進捗" },
  { key: "performance", label: "損益レポート" },
  { key: "bidding", label: "入札振り返り" },
  { key: "forecast", label: "利益予測" },
  { key: "cashflow", label: "資金繰り" },
]

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("monthly")

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "12px 24px 0",
          borderBottom: "1px solid #2a2a2a",
          background: "#0a0a0a",
          overflowX: "auto",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 18px",
              background: tab === t.key ? "#1a1a1a" : "transparent",
              border: "1px solid #2a2a2a",
              borderBottom:
                tab === t.key ? "1px solid #1a1a1a" : "1px solid #2a2a2a",
              borderRadius: "6px 6px 0 0",
              color: tab === t.key ? "#f97316" : "#a3a3a3",
              fontFamily: "'DM Mono', 'Courier New', monospace",
              fontSize: 13,
              fontWeight: tab === t.key ? "bold" : "normal",
              cursor: "pointer",
              marginBottom: -1,
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "monthly" && <MonthlyProgressContent />}
      {tab === "performance" && <PerformanceContent />}
      {tab === "bidding" && <BiddingAnalyticsContent />}
      {tab === "forecast" && <ProfitForecastContent />}
      {tab === "cashflow" && <CashflowContent />}
    </div>
  )
}
