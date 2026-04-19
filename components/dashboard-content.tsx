"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getVehiclesFromSupabase, getConnectionStatus } from "@/app/actions/vehicles"
import { countUnfilledSold } from "@/app/actions/inventory-actuals"
import type { VehicleDisplay } from "@/lib/vehicle-display"
import {
  C,
  font,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  kpiCard,
  lbl,
  badge,
} from "@/components/ui-system"
import { BiddingSummaryCards } from "@/components/bidding-summary-cards"

const GOAL = 1000000
const fmt = (n: number) => `¥${n.toLocaleString()}`

export function DashboardContent() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<VehicleDisplay[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [unfilledCount, setUnfilledCount] = useState<number>(0)
  const [connectionStatus, setConnectionStatus] = useState<{
    supabase: "ok" | "env_missing" | "error"
  }>({ supabase: "env_missing" })

  useEffect(() => {
    async function load() {
      const status = await getConnectionStatus()
      setConnectionStatus(status)
      if (status.supabase === "ok") {
        const [vehiclesResult, unfilledResult] = await Promise.all([
          getVehiclesFromSupabase(),
          countUnfilledSold(),
        ])
        if (vehiclesResult.vehicles) setVehicles(vehiclesResult.vehicles)
        if (unfilledResult.success) setUnfilledCount(unfilledResult.count)
      }
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const isThisMonth = (dateStr: string | null | undefined) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    )
  }
  const soldThisMonth = (vehicles ?? []).filter(
    (v) => v.status === "売却済" && isThisMonth(v.createdAt)
  )
  const purchasedThisMonth = (vehicles ?? []).filter((v) =>
    isThisMonth(v.createdAt)
  )
  const monthlyProfit = soldThisMonth.reduce(
    (a, v) => a + (v.expectedProfitJPY ?? 0),
    0
  )
  const pct = Math.min(Math.round((monthlyProfit / GOAL) * 100), 100)
  const inStock = (vehicles ?? []).filter(
    (v) => v.status === "在庫あり" || v.status === "出品中"
  ).length
  const recent = [...(vehicles ?? [])]
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? "").getTime() -
        new Date(a.createdAt ?? "").getTime()
    )
    .slice(0, 5)

  if (loading)
    return (
      <div style={{ ...pageWrapper, color: C.textMuted }}>
        読み込み中...
      </div>
    )

  return (
    <div style={pageWrapper}>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            ...pageTitle,
            background: `linear-gradient(135deg, ${C.text} 60%, ${C.orange})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ダッシュボード
        </div>
        <div style={pageSub}>
          {now.toLocaleDateString("ja-JP")} · バイク輸出事業 管理システム ·{" "}
          <span
            style={{
              color:
                connectionStatus.supabase === "ok" ? C.green : C.red,
            }}
          >
            Supabase {connectionStatus.supabase === "ok" ? "●" : "○"}
          </span>
        </div>
      </div>

      <Link href="/bds-border" style={{ textDecoration: "none" }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${C.orange}15, ${C.orange}05)`,
            border: `1px solid ${C.orange}`,
            borderRadius: 12,
            padding: "18px 24px",
            marginBottom: 24,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 36 }}>🎯</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.orange, marginBottom: 2 }}>
              仕入ボーダー計算
            </div>
            <div style={{ fontSize: 12, color: C.textSub }}>
              ヤフオク相場 × 車種 × 会場 から逆算。過去実績も自動比較。
            </div>
          </div>
          <div style={{ fontSize: 24, color: C.orange }}>→</div>
        </div>
      </Link>

      <BiddingSummaryCards />

      {unfilledCount > 0 && (
        <Link
          href="/inventory"
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              ...card(C.yellowGlow ?? `${C.yellow}18`),
              borderLeft: `3px solid ${C.yellow}`,
              marginBottom: 24,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 32 }}>⚠</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.yellow, fontWeight: 700, marginBottom: 4 }}>
                実績未入力のバイク
              </div>
              <div style={{ fontSize: 12, color: C.textSub }}>
                売約済みだけど売却価格が未入力の車両があります。仕入れ判断の精度UPのため、2項目だけ入れてください。
              </div>
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: "bold",
                color: C.yellow,
                minWidth: 60,
                textAlign: "right",
              }}
            >
              {unfilledCount}台 →
            </div>
          </div>
        </Link>
      )}

      <div
        style={{
          ...card(C.orangeGlow),
          borderLeft: `3px solid ${C.orange}`,
          marginBottom: 24,
        }}
        className="card-glow-orange"
      >
        <div style={lbl}>月利目標進捗</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 12,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 36,
                fontWeight: "bold",
                color: C.orange,
                letterSpacing: -1,
              }}
            >
              {fmt(monthlyProfit)}
            </span>
            <span
              style={{ fontSize: 13, color: C.textMuted, marginLeft: 8 }}
            >
              / {fmt(GOAL)}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: C.textSub }}>あと</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: C.textSub,
              }}
            >
              {fmt(Math.max(GOAL - monthlyProfit, 0))}
            </div>
          </div>
        </div>
        <div
          style={{
            height: 8,
            background: "#1a1a1e",
            borderRadius: 4,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: `linear-gradient(to right, ${C.orange}, ${C.green})`,
              borderRadius: 4,
              transition: "width 1s ease",
              boxShadow: `0 0 12px ${C.orange}60`,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: pct >= 50 ? C.green : C.textMuted,
              fontWeight: "bold",
            }}
          >
            {pct}% 達成
          </span>
          <span style={{ fontSize: 11, color: C.textMuted }}>
            {soldThisMonth.length}台 売却済み
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "今月仕入",
            value: `${purchasedThisMonth.length}台`,
            color: C.orange,
            glow: C.orangeGlow,
          },
          {
            label: "在庫・出品中",
            value: `${inStock}台`,
            color: C.blue,
            glow: C.blueGlow,
          },
          {
            label: "今月売却",
            value: `${soldThisMonth.length}台`,
            color: C.green,
            glow: C.greenGlow,
          },
        ].map((k, i) => (
          <div
            key={i}
            style={kpiCard(k.color)}
            className="card-glow-orange"
          >
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 60,
                height: 60,
                background: `radial-gradient(circle, ${k.glow} 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            <div style={lbl}>{k.label}</div>
            <div
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: k.color,
                letterSpacing: -1,
              }}
            >
              {k.value}
            </div>
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
        <div style={card()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={lbl}>直近の査定履歴</div>
            <button
              onClick={() => router.push("/assess")}
              style={{
                fontSize: 11,
                color: C.orange,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              査定ページへ →
            </button>
          </div>
          {recent.length === 0 ? (
            <div
              style={{
                fontSize: 13,
                color: C.textMuted,
                padding: "20px 0",
                textAlign: "center",
              }}
            >
              査定データなし
            </div>
          ) : (
            recent.map((v, i) => {
              const statusColor =
                v.status === "売却済"
                  ? C.green
                  : v.status === "出品中"
                    ? C.blue
                    : v.status === "在庫あり"
                      ? C.orange
                      : C.textMuted
              return (
                <div
                  key={v.id}
                  onClick={() => router.push(`/vehicle/${v.id}`)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom:
                      i < recent.length - 1
                        ? `1px solid ${C.border}50`
                        : "none",
                    cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.opacity = "0.7")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.opacity = "1")
                  }
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        marginBottom: 3,
                        color: C.text,
                      }}
                    >
                      {v.name ?? "（車種未入力）"}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>
                      {v.createdAt?.slice(0, 10)}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    {v.expectedProfitJPY != null && v.expectedProfitJPY > 0 && (
                      <span
                        style={{ fontSize: 12, color: C.textSub }}
                      >
                        {fmt(v.expectedProfitJPY)}
                      </span>
                    )}
                    <span style={badge(statusColor)}>{v.status}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div style={card()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={lbl}>相場トレンド</div>
            <button
              onClick={() => router.push("/market")}
              style={{
                fontSize: 11,
                color: C.orange,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              相場DBへ →
            </button>
          </div>
          {[
            {
              model: "カブ系",
              trend: "↑",
              note: "輸出需要高・BDS競争激化",
              color: C.green,
            },
            {
              model: "シグナス125",
              trend: "→",
              note: "台湾向け安定相場",
              color: C.yellow,
            },
            {
              model: "モンキー系",
              trend: "↑",
              note: "国内プレミアム継続中",
              color: C.green,
            },
            {
              model: "CB400SF",
              trend: "↓",
              note: "在庫過多・価格調整局面",
              color: C.red,
            },
          ].map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                background: "#0d0d0f",
                borderRadius: 6,
                marginBottom: 8,
                border: `1px solid ${C.border}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    marginBottom: 2,
                  }}
                >
                  {t.model}
                </div>
                <div style={{ fontSize: 11, color: C.textSub }}>
                  {t.note}
                </div>
              </div>
              <span
                style={{
                  fontSize: 22,
                  color: t.color,
                  fontWeight: "bold",
                }}
              >
                {t.trend}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
