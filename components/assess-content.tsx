"use client"

import { useState } from "react"
import {
  C,
  font,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  lbl,
  inp,
  btn,
  badge,
} from "@/components/ui-system"

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

const fmt = (n: number) => `¥${Number(n).toLocaleString()}`
const VC = { GO: C.green, NG: C.red, CAUTION: C.yellow }
const VG = { GO: C.greenGlow, NG: C.redGlow, CAUTION: C.yellowGlow }

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
        setError(
          err instanceof Error ? err.message : "査定に失敗しました"
        )
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
          査定
        </div>
        <div style={pageSub}>
          BDS個票スクショ → AI解析 → GO / NG / CAUTION 判定
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        <div>
          <div style={card()}>
            <div style={lbl}>BDS個票スクショ</div>
            <label style={{ cursor: "pointer", display: "block" }}>
              <div
                style={{
                  border: `2px dashed ${preview ? C.orange : C.border}`,
                  borderRadius: 8,
                  padding: 32,
                  textAlign: "center",
                  background: preview ? `${C.orange}06` : "#0a0a0b",
                  transition: "all 0.2s",
                  boxShadow: preview
                    ? `inset 0 0 20px ${C.orangeGlow}`
                    : "none",
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 280,
                      borderRadius: 6,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div>
                    <div
                      style={{
                        fontSize: 40,
                        marginBottom: 12,
                        color: C.border,
                      }}
                    >
                      ↑
                    </div>
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
                      style={{
                        fontSize: 11,
                        color: C.textMuted,
                      }}
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
                ...btn("primary"),
                width: "100%",
                padding: "14px 0",
                fontSize: 14,
                marginBottom: 12,
                opacity: loading ? 0.6 : 1,
                boxShadow: loading ? "none" : `0 0 20px ${C.orangeGlow}`,
              }}
            >
              {loading ? "AIが解析中..." : "査定する"}
            </button>
          )}

          {error && (
            <div
              style={{
                padding: 14,
                background: C.redGlow,
                border: `1px solid ${C.red}40`,
                borderRadius: 8,
                color: C.red,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              ⚠ {error}
            </div>
          )}
        </div>

        <div>
          {loading && (
            <div
              style={{
                ...card(),
                minHeight: 320,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 32 }}>◎</div>
              <div
                style={{
                  fontSize: 13,
                  color: C.textMuted,
                }}
              >
                AIが解析中...
              </div>
            </div>
          )}

          {result && !loading && (
            <>
              <div
                style={{
                  ...card(VG[result.verdict]),
                  borderLeft: `4px solid ${VC[result.verdict]}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: `linear-gradient(135deg, ${C.surface} 60%, ${VG[result.verdict]})`,
                }}
              >
                <div>
                  <div style={lbl}>判定</div>
                  <div
                    style={{
                      fontSize: 48,
                      fontWeight: "bold",
                      color: VC[result.verdict],
                      letterSpacing: -2,
                      lineHeight: 1,
                    }}
                  >
                    {result.verdict}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.textSub,
                    maxWidth: 180,
                    lineHeight: 1.7,
                    textAlign: "right",
                  }}
                >
                  {result.verdict_reason}
                </div>
              </div>

              <div
                style={{
                  ...card(C.orangeGlow),
                  borderLeft: `4px solid ${C.orange}`,
                  textAlign: "center",
                }}
              >
                <div style={lbl}>BDS 入札上限額</div>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: "bold",
                    color: C.orange,
                    letterSpacing: -1,
                  }}
                >
                  {fmt(result.bid_limit)}
                </div>
              </div>

              <div style={card()}>
                <div style={lbl}>車両情報</div>
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
                      padding: "8px 0",
                      borderBottom: `1px solid ${C.border}40`,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: C.textMuted }}>{k}</span>
                    <span style={{ color: C.text }}>{v || "—"}</span>
                  </div>
                ))}
                {result.damage_summary && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "#0a0a0b",
                      borderRadius: 6,
                      fontSize: 12,
                      color: C.textSub,
                      lineHeight: 1.8,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {result.damage_summary}
                  </div>
                )}
              </div>

              <div style={card()}>
                <div style={lbl}>収支シミュレーション</div>
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
                      padding: "8px 0",
                      borderBottom: `1px solid ${C.border}40`,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: C.textMuted }}>{k}</span>
                    <span style={{ color, fontWeight: "bold" }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={saved}
                style={{
                  ...btn("ghost"),
                  width: "100%",
                  padding: "12px 0",
                  background: saved ? C.greenGlow : "transparent",
                  color: saved ? C.green : C.textSub,
                  border: `1px solid ${saved ? C.green : C.border}`,
                  boxShadow: saved
                    ? `0 0 16px ${C.greenGlow}`
                    : "none",
                }}
              >
                {saved
                  ? "✓ Supabaseに保存済み"
                  : "Supabaseに保存する"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
