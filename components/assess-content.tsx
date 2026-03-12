"use client"

import { useState } from "react"
import type { CSSProperties } from "react"

type AssessmentResult = {
  bike_name: string
  chassis_number: string
  year: string
  mileage: string
  color: string
  displacement: string
  parts: string
  auction_price: number
  engine_status: string
  damage_summary: string
  total_cost_min: number
  total_cost_max: number
  sell_price_min: number
  sell_price_max: number
  profit_min: number
  profit_max: number
  verdict: "GO" | "NG" | "CAUTION"
  verdict_reason: string
  bid_limit: number
}

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

const VC = { GO: C.green, NG: C.red, CAUTION: C.yellow }
const fmt = (n: number) => `¥${Number(n).toLocaleString()}`

export function AssessContent() {
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setSaved(false)
    setError(null)
  }

  const handleAssess = async () => {
    if (!image) return
    setLoading(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1]
      try {
        const res = await fetch("/api/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: image.type }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setResult(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "査定に失敗しました")
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(image)
  }

  const handleSave = async () => {
    if (!result) return
    try {
      const res = await fetch("/api/assess/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      })
      if (!res.ok) throw new Error("保存失敗")
      setSaved(true)
    } catch {
      setError("Supabaseへの保存に失敗しました")
    }
  }

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono','Courier New',monospace",
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
        査定
      </div>
      <div
        style={{
          fontSize: 12,
          color: C.textSub,
          marginBottom: 28,
        }}
      >
        BDS個票スクショ → AI解析 → GO/NG/CAUTION判定
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        {/* LEFT: アップロード */}
        <div>
          <div style={card}>
            <div style={label}>BDS個票スクショ</div>
            <label style={{ cursor: "pointer", display: "block" }}>
              <div
                style={{
                  border: `2px dashed ${preview ? C.orange : C.border}`,
                  borderRadius: 8,
                  padding: 24,
                  textAlign: "center",
                  background: preview ? `${C.orange}08` : "#0e0e10",
                  transition: "all 0.2s",
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 300,
                      borderRadius: 6,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>↑</div>
                    <div
                      style={{
                        fontSize: 13,
                        color: C.textSub,
                        marginBottom: 4,
                      }}
                    >
                      ファイルをドロップ or クリック
                    </div>
                    <div
                      style={{ fontSize: 11, color: C.textMuted }}
                    >
                      PNG / JPG / WebP / PDF
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {image && (
            <button
              onClick={handleAssess}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 0",
                background: loading ? C.border : C.orange,
                color: "#fff",
                fontWeight: "bold",
                fontSize: 14,
                borderRadius: 8,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                letterSpacing: 0.5,
                marginBottom: 12,
              }}
            >
              {loading ? "解析中..." : "査定する"}
            </button>
          )}

          {error && (
            <div
              style={{
                padding: 12,
                background: `${C.red}10`,
                border: `1px solid ${C.red}40`,
                borderRadius: 8,
                color: C.red,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* RIGHT: 結果 */}
        <div>
          {loading && (
            <div
              style={{
                ...card,
                minHeight: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.textMuted,
                fontSize: 13,
              }}
            >
              AIが解析中...
            </div>
          )}

          {result && !loading && (
            <>
              {/* GO/NG/CAUTION */}
              <div
                style={{
                  ...card,
                  borderLeft: `4px solid ${VC[result.verdict]}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={label}>判定</div>
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: "bold",
                      color: VC[result.verdict],
                    }}
                  >
                    {result.verdict}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: C.textSub,
                    maxWidth: 200,
                    lineHeight: 1.6,
                  }}
                >
                  {result.verdict_reason}
                </div>
              </div>

              {/* 入札上限 */}
              <div
                style={{
                  ...card,
                  borderLeft: `4px solid ${C.orange}`,
                  textAlign: "center",
                }}
              >
                <div style={label}>BDS 入札上限</div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: "bold",
                    color: C.orange,
                  }}
                >
                  {fmt(result.bid_limit)}
                </div>
              </div>

              {/* 車両情報 */}
              <div style={card}>
                <div style={label}>車両情報</div>
                {[
                  { k: "車種", v: result.bike_name },
                  { k: "年式", v: result.year },
                  { k: "走行距離", v: result.mileage },
                  { k: "排気量", v: result.displacement },
                  { k: "エンジン", v: result.engine_status },
                ].map(({ k, v }) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: `1px solid ${C.border}50`,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: C.textMuted }}>{k}</span>
                    <span>{v || "—"}</span>
                  </div>
                ))}
                {result.damage_summary && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      background: "#0e0e10",
                      borderRadius: 6,
                      fontSize: 12,
                      color: C.textSub,
                      lineHeight: 1.7,
                    }}
                  >
                    {result.damage_summary}
                  </div>
                )}
              </div>

              {/* 収支 */}
              <div style={card}>
                <div style={label}>収支シミュレーション</div>
                {[
                  {
                    k: "仕入価格",
                    v: fmt(result.auction_price),
                    color: C.text,
                  },
                  {
                    k: "総コスト",
                    v: `${fmt(result.total_cost_min)} 〜 ${fmt(result.total_cost_max)}`,
                    color: C.yellow,
                  },
                  {
                    k: "想定売却",
                    v: `${fmt(result.sell_price_min)} 〜 ${fmt(result.sell_price_max)}`,
                    color: C.blue,
                  },
                  {
                    k: "粗利",
                    v: `${fmt(result.profit_min)} 〜 ${fmt(result.profit_max)}`,
                    color:
                      result.profit_min > 0 ? C.green : C.red,
                  },
                ].map(({ k, v, color }) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: `1px solid ${C.border}50`,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: C.textMuted }}>{k}</span>
                    <span style={{ color, fontWeight: "bold" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* 保存ボタン */}
              <button
                onClick={handleSave}
                disabled={saved}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  background: saved ? `${C.green}20` : "transparent",
                  color: saved ? C.green : C.textSub,
                  border: `1px solid ${saved ? C.green : C.border}`,
                  borderRadius: 8,
                  cursor: saved ? "default" : "pointer",
                  fontWeight: "bold",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                {saved ? "✓ Supabaseに保存済み" : "Supabaseに保存する"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
