"use client"

import { useState } from "react"
import AuctionDayContent from "@/components/auction-day-content"
import ScoreboardContent from "@/components/scoreboard-content"

type Tab = "decision" | "scoreboard"

export default function AuctionDayPage() {
  const [tab, setTab] = useState<Tab>("decision")

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "12px 24px 0",
          borderBottom: "1px solid #2a2a2a",
          background: "#0a0a0a",
        }}
      >
        <TabBtn active={tab === "decision"} onClick={() => setTab("decision")}>
          入札判断
        </TabBtn>
        <TabBtn active={tab === "scoreboard"} onClick={() => setTab("scoreboard")}>
          利益スコアボード
        </TabBtn>
      </div>
      {tab === "decision" ? <AuctionDayContent /> : <ScoreboardContent />}
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 20px",
        background: active ? "#1a1a1a" : "transparent",
        border: "1px solid #2a2a2a",
        borderBottom: active ? "1px solid #1a1a1a" : "1px solid #2a2a2a",
        borderRadius: "6px 6px 0 0",
        color: active ? "#f97316" : "#a3a3a3",
        fontFamily: "'DM Mono', 'Courier New', monospace",
        fontSize: 13,
        fontWeight: active ? "bold" : "normal",
        cursor: "pointer",
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  )
}
