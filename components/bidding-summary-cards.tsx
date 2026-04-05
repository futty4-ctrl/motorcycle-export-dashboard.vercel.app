"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getBiddingSummary, type BiddingSummary } from "@/app/actions/bidding-summary"

const COLORS = {
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  border: "#2a2a2a",
  orange: "#f97316",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
}

const fmt = (n: number) => `¥${Math.round(n).toLocaleString()}`

export function BiddingSummaryCards() {
  const [summary, setSummary] = useState<BiddingSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBiddingSummary().then((res) => {
      if (res.success && res.summary) setSummary(res.summary)
      setLoading(false)
    })
  }, [])

  if (loading || !summary) return null

  const hasUnjudged = summary.unjudged > 0

  return (
    <section style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <h2
          style={{
            fontFamily: COLORS.font,
            fontSize: 13,
            color: COLORS.orange,
            letterSpacing: "0.05em",
            margin: 0,
          }}
        >
          # 仕入れ判断サマリー
        </h2>
        <Link
          href="/bidding"
          style={{
            fontFamily: COLORS.font,
            fontSize: 11,
            color: COLORS.textSub,
            textDecoration: "none",
          }}
        >
          入札判断へ →
        </Link>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        {hasUnjudged ? (
          <Link
            href="/auction-day"
            style={{ textDecoration: "none" }}
          >
            <Card
              label="未判定"
              value={`${summary.unjudged}件`}
              color={COLORS.yellow}
              accent
            />
          </Link>
        ) : (
          <Card
            label="未判定"
            value="0件"
            color={COLORS.textMuted}
          />
        )}
        <Card
          label="今週のGO"
          value={`${summary.weekGo}件`}
          color={COLORS.green}
          sub={`/ ${summary.weekTotal}件評価`}
        />
        <Card
          label="今週のNO GO"
          value={`${summary.weekNoGo}件`}
          color={COLORS.red}
        />
        <Card
          label="今週の見送り"
          value={`${summary.weekSkip}件`}
          color={COLORS.textMuted}
        />
        <Card
          label="今月の売却"
          value={`${summary.monthSoldCount}台`}
          color={COLORS.blue}
        />
        <Card
          label="今月の実利益"
          value={fmt(summary.monthProfit)}
          color={summary.monthProfit >= 0 ? COLORS.green : COLORS.red}
        />
      </div>
    </section>
  )
}

function Card({
  label,
  value,
  color,
  sub,
  accent,
}: {
  label: string
  value: string
  color: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        background: accent ? `${color}15` : COLORS.surface,
        border: `1px solid ${accent ? color : COLORS.border}`,
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div
        style={{
          fontFamily: COLORS.font,
          fontSize: 9,
          color: COLORS.textSub,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: COLORS.font,
          fontSize: 20,
          fontWeight: 700,
          color,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: COLORS.font,
            fontSize: 9,
            color: COLORS.textMuted,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
