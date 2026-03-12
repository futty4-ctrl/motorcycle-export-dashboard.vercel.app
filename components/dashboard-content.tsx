"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getVehiclesFromSupabase,
  getConnectionStatus,
  type SummaryData,
} from "@/app/actions/vehicles"
import type { VehicleDisplay } from "@/lib/vehicle-display"
import type { CSSProperties } from "react"

const C = {
  surface: "#111113",
  border: "#1e1e22",
  orange: "#f5720a",
  text: "#e8e8ec",
  textMuted: "#6b6b74",
  textSub: "#9999a8",
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#eab308",
}

const GOAL = 1000000

const card: CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: 20,
  marginBottom: 16,
}
const label: CSSProperties = {
  fontSize: 11,
  color: C.textMuted,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 8,
}
const badge = (color: string): CSSProperties => ({
  display: "inline-block",
  padding: "3px 8px",
  borderRadius: 4,
  fontSize: 11,
  background: `${color}20`,
  color,
  fontWeight: "bold",
})

export function DashboardContent() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<VehicleDisplay[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<{
    supabase: "ok" | "env_missing" | "error"
  }>({ supabase: "env_missing" })

  useEffect(() => {
    async function load() {
      const status = await getConnectionStatus()
      setConnectionStatus(status)
      if (status.supabase === "ok") {
        const result = await getVehiclesFromSupabase()
        if (result.data) setVehicles(result.data)
      }
      setLoading(false)
    }
    load()
  }, [])

  // 粗利計算
  const soldVehicles = vehicles?.filter((v) => v.status === "売却済") ?? []
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const monthlyProfit = soldVehicles
    .filter((v) => {
      const d = new Date(v.created_at ?? "")
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    })
    .reduce((a, v) => a + (v.profit ?? 0), 0)

  const pct = Math.min(Math.round((monthlyProfit / GOAL) * 100), 100)

  // 直近査定（最新5件）
  const recentAssessments = [...(vehicles ?? [])]
    .sort(
      (a, b) =>
        new Date(b.created_at ?? "").getTime() -
        new Date(a.created_at ?? "").getTime()
    )
    .slice(0, 5)

  // ステータス別カウント
  const inStock =
    vehicles?.filter(
      (v) => v.status === "在庫あり" || v.status === "出品中"
    ).length ?? 0
  const totalVehicles = vehicles?.length ?? 0

  if (loading)
    return (
      <div
        style={{
          padding: 40,
          color: C.textMuted,
          fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        読み込み中...
      </div>
    )

  return (
    <div
      style={{
        fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        color: C.text,
        padding: "32px 40px",
        maxWidth: 900,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 4,
        }}
      >
        ダッシュボード
      </div>
      <div
        style={{
          fontSize: 12,
          color: C.textSub,
          marginBottom: 28,
        }}
      >
        {new Date().toLocaleDateString("ja-JP")} · バイク輸出事業 管理システム
      </div>

      {/* 月利目標進捗バー */}
      <div
        style={{
          ...card,
          borderLeft: `3px solid ${C.orange}`,
        }}
      >
        <div style={label}>月利目標進捗</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            alignItems: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: C.orange,
            }}
          >
            ¥{monthlyProfit.toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: C.textSub }}>
            目標 ¥{GOAL.toLocaleString()}
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: "#1e1e22",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: `linear-gradient(to right, ${C.orange}, ${C.green})`,
              borderRadius: 3,
              transition: "width 0.8s ease",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <span style={{ fontSize: 11, color: C.textSub }}>
            {pct}% 達成
          </span>
          <span style={{ fontSize: 11, color: C.textSub }}>
            あと ¥{Math.max(GOAL - monthlyProfit, 0).toLocaleString()} 分
          </span>
        </div>
      </div>

      {/* KPIカード */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {[
          { label: "総車両数", value: `${totalVehicles}台`, color: C.orange },
          { label: "在庫・出品中", value: `${inStock}台`, color: C.blue },
          {
            label: "今月売却済",
            value: `${soldVehicles.filter((v) => {
              const d = new Date(v.created_at ?? "")
              return d.getMonth() === thisMonth
            }).length}台`,
            color: C.green,
          },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              ...card,
              marginBottom: 0,
              borderLeft: `3px solid ${k.color}`,
            }}
          >
            <div style={label}>{k.label}</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: "bold",
                color: k.color,
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* 直近の査定履歴 */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={label}>直近の査定履歴</div>
          <button
            onClick={() => router.push("/assess")}
            style={{
              fontSize: 11,
              color: C.orange,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            査定ページへ →
          </button>
        </div>
        {recentAssessments.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: C.textMuted,
              padding: "12px 0",
            }}
          >
            査定データなし
          </div>
        ) : (
          recentAssessments.map((v, i) => (
            <div
              key={v.id}
              onClick={() => router.push(`/vehicle/${v.id}`)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom:
                  i < recentAssessments.length - 1
                    ? `1px solid ${C.border}50`
                    : "none",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontSize: 13, marginBottom: 3 }}>
                  {v.vehicle_name ?? "（車種未入力）"}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  {v.created_at?.slice(0, 10)} · {v.bds_rating ?? "—"}
                </div>
              </div>
              <div
                style={{
                  textAlign: "right",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                {v.purchase_price && (
                  <span style={{ fontSize: 12, color: C.textSub }}>
                    ¥{v.purchase_price.toLocaleString()}
                  </span>
                )}
                <span
                  style={badge(
                    v.status === "売却済"
                      ? C.green
                      : v.status === "出品中"
                        ? C.blue
                        : v.status === "在庫あり"
                          ? C.orange
                          : C.textMuted
                  )}
                >
                  {v.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 相場トレンド一言サマリー */}
      <div style={card}>
        <div style={label}>相場トレンド</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            {
              model: "カブ系",
              trend: "↑",
              note: "輸出需要高・BDS競争激化",
            },
            { model: "シグナス125", trend: "→", note: "台湾向け安定相場" },
            { model: "モンキー系", trend: "↑", note: "国内プレミアム継続中" },
          ].map((t, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 160,
                background: "#0e0e10",
                borderRadius: 6,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: "bold" }}>
                  {t.model}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    color:
                      t.trend === "↑"
                        ? C.green
                        : t.trend === "↓"
                          ? C.red
                          : C.yellow,
                  }}
                >
                  {t.trend}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.textSub }}>{t.note}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => router.push("/market")}
          style={{
            marginTop: 12,
            fontSize: 11,
            color: C.orange,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          相場DBを見る →
        </button>
      </div>

      {/* 接続状態 */}
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
        Supabase:{" "}
        <span
          style={{
            color:
              connectionStatus.supabase === "ok" ? C.green : C.red,
          }}
        >
          {connectionStatus.supabase === "ok" ? "接続OK" : "未接続"}
        </span>
      </div>
    </div>
  )
}
