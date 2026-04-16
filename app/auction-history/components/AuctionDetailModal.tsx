"use client"

import { useEffect, useState } from "react"
import type { AuctionHistoryRecord, BidResult } from "@/types/auction-history"
import { C, lbl, inp, btn, badge } from "@/components/ui-system"
import { updateAuctionRecord } from "@/app/actions/auction-history"

interface Props {
  record: AuctionHistoryRecord | null
  onClose: () => void
  onUpdated: () => void
}

function calcBidLimitAt(r: AuctionHistoryRecord, targetProfit: number): number | null {
  if (!r.market_min_price || !r.market_max_price) return null
  const assumedSale = (r.market_min_price + r.market_max_price) / 2
  const yahooTakeHome = assumedSale * 0.912
  return Math.max(0, Math.round((yahooTakeHome - 20000 - 700 - targetProfit) / 1.1))
}

function formatPrice(n: number | null): string {
  if (!n) return "-"
  return `¥${n.toLocaleString()}`
}

// parts_included "総5 E5 F5 外3 R5 電5 車5" を 7項目スコアに分解
const SCORE_KEYS = ["総", "E", "F", "外", "R", "電", "車"] as const
const SCORE_LABELS: Record<string, string> = {
  総: "総合", E: "ｴﾝｼﾞﾝ", F: "F足", 外: "外装", R: "R足", 電: "電装", 車: "車台",
}
function parseScores(parts: string | null): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const k of SCORE_KEYS) out[k] = null
  if (!parts) return out
  for (const k of SCORE_KEYS) {
    const m = parts.match(new RegExp(`${k}(\\d+)`))
    if (m) out[k] = parseInt(m[1], 10)
  }
  return out
}

// notes を [出品店申告]/[BDS報告]/[検査]/その他 に分解
function parseNotes(notes: string): {
  seller: string
  bds: string
  inspection: string[]
  other: string
} {
  const res = { seller: "", bds: "", inspection: [] as string[], other: "" }
  if (!notes) return res
  const sections = notes.split(/\n(?=\[)/)
  const otherParts: string[] = []
  for (const s of sections) {
    if (s.startsWith("[出品店申告]")) res.seller = s.replace(/^\[出品店申告\]\s*/, "").trim()
    else if (s.startsWith("[BDS報告]")) res.bds = s.replace(/^\[BDS報告\]\s*/, "").trim()
    else if (s.startsWith("[検査]")) {
      res.inspection = s.replace(/^\[検査\]\s*/, "").split("|").map((x) => x.trim()).filter(Boolean)
    } else otherParts.push(s.trim())
  }
  res.other = otherParts.filter(Boolean).join("\n")
  return res
}

function scoreColor(n: number | null): string {
  if (n == null) return "#525252"
  if (n >= 7) return "#22c55e"
  if (n >= 5) return "#f5f5f5"
  if (n >= 4) return "#f97316"
  return "#ef4444"
}

export function AuctionDetailModal({ record, onClose, onUpdated }: Props) {
  const [notes, setNotes] = useState("")
  const [myBidPrice, setMyBidPrice] = useState<number | null>(null)
  const [bidResult, setBidResult] = useState<BidResult | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (record) {
      setNotes(record.notes || "")
      setMyBidPrice(record.my_bid_price)
      setBidResult(record.bid_result)
    }
  }, [record])

  if (!record) return null

  const bidLimit2 = calcBidLimitAt(record, 20000)
  const bidLimit3 = calcBidLimitAt(record, 30000)
  const bidLimit5 = calcBidLimitAt(record, 50000)
  const scores = parseScores(record.parts_included)
  const hasScores = Object.values(scores).some((v) => v != null)
  const noteSections = parseNotes(record.notes || "")

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateAuctionRecord(record.id, {
        notes,
        my_bid_price: myBidPrice,
        bid_result: bidResult,
      })
      if (!res.success) {
        alert("保存に失敗しました: " + res.error)
        return
      }
      onUpdated()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 20,
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="auction-detail-modal"
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          maxWidth: 1000,
          width: "100%",
          padding: "clamp(14px, 3vw, 28px)",
          marginTop: 20,
          marginBottom: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              {record.record_type === "evaluation" ? (
                <span style={badge(C.orange)}>査定</span>
              ) : (
                <span style={badge(C.textSub)}>履歴</span>
              )}
              {record.result_status === "sold" && <span style={badge(C.green)}>落札</span>}
              {record.result_status === "unsold" && <span style={badge(C.red)}>流札</span>}
              {record.bds_lot_number && (
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: C.textMuted,
                  }}
                >
                  Lot #{record.bds_lot_number}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: C.text,
                letterSpacing: -0.3,
              }}
            >
              {record.model_name || "（車種名なし）"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: C.textMuted,
              fontSize: 22,
              cursor: "pointer",
              padding: "0 8px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* 写真ギャラリー */}
        {record.photo_urls.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={lbl}>写真 ({record.photo_urls.length}枚)</div>
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                padding: "4px 0",
              }}
            >
              {record.photo_urls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`photo ${i + 1}`}
                  style={{
                    height: 120,
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 基本情報 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <Field label="オークション日" value={record.auction_date} />
          <Field label="会場" value={record.auction_type} />
          <Field label="地域" value={record.region} />
          <Field label="排気量" value={record.displacement_cc ? `${record.displacement_cc}cc` : null} />
          <Field
            label="走行距離"
            value={record.mileage_km ? `${record.mileage_km.toLocaleString()} km` : null}
          />
          <Field label="初年度登録" value={record.first_registration} />
          <Field label="車検" value={record.inspection} />
          <Field label="車台番号" value={record.chassis_number} mono />
          <Field label="エンジン型式" value={record.engine_model} mono />
        </div>

        {/* 7項目スコア */}
        {hasScores && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(55px, 1fr))",
              gap: 8,
              marginBottom: 20,
              padding: 14,
              background: C.surface,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
            }}
          >
            {SCORE_KEYS.map((k) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, letterSpacing: 0.5 }}>
                  {SCORE_LABELS[k]}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    color: scoreColor(scores[k]),
                  }}
                >
                  {scores[k] ?? "-"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 価格情報 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 14,
            marginBottom: 20,
            padding: 16,
            background: C.surface,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
          }}
        >
          <Field label="開始価格" value={formatPrice(record.start_price)} mono />
          <Field
            label="希望落札価格"
            value={formatPrice(record.reserve_price)}
            mono
          />
          <Field
            label="落札価格"
            value={formatPrice(record.sold_price)}
            mono
            highlight={record.sold_price ? C.green : undefined}
          />
        </div>

        {/* 相場情報 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 14,
            marginBottom: 12,
            padding: 16,
            background: C.surface,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
          }}
        >
          <Field label="相場サンプル数" value={record.market_sold_count?.toString() ?? null} />
          <Field label="相場・最低" value={formatPrice(record.market_min_price)} mono />
          <Field label="相場・最高" value={formatPrice(record.market_max_price)} mono />
        </div>

        {/* 入札上限 3段階 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            { label: "利益 2万", v: bidLimit2, color: C.green },
            { label: "利益 3万", v: bidLimit3, color: C.orange },
            { label: "利益 5万", v: bidLimit5, color: C.red },
          ].map((t) => (
            <div
              key={t.label}
              style={{
                padding: "14px 16px",
                background: C.surface,
                borderRadius: 8,
                border: `1px solid ${t.color}40`,
                borderLeft: `3px solid ${t.color}`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: t.color,
                  letterSpacing: 1.5,
                  fontWeight: "bold",
                  marginBottom: 6,
                }}
              >
                {t.label}で落とすなら
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 22,
                  fontWeight: "bold",
                  color: t.v != null && t.v > 0 ? t.color : C.textMuted,
                }}
              >
                {t.v != null && t.v > 0 ? `¥${t.v.toLocaleString()}` : "不可"}
              </div>
            </div>
          ))}
        </div>

        {/* 出品店申告 / BDS報告 / 検査詳細 */}
        {(noteSections.seller || noteSections.bds || noteSections.inspection.length > 0) && (
          <div style={{ marginBottom: 20, display: "grid", gap: 12 }}>
            {noteSections.seller && (
              <div
                style={{
                  padding: 14,
                  background: C.surface,
                  borderRadius: 8,
                  borderLeft: `3px solid ${C.green}`,
                }}
              >
                <div style={{ fontSize: 10, color: C.green, letterSpacing: 1.5, fontWeight: "bold", marginBottom: 6 }}>
                  出品店申告
                </div>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
                  {noteSections.seller}
                </div>
              </div>
            )}
            {noteSections.bds && (
              <div
                style={{
                  padding: 14,
                  background: C.surface,
                  borderRadius: 8,
                  borderLeft: `3px solid ${C.orange}`,
                }}
              >
                <div style={{ fontSize: 10, color: C.orange, letterSpacing: 1.5, fontWeight: "bold", marginBottom: 6 }}>
                  BDS報告
                </div>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
                  {noteSections.bds}
                </div>
              </div>
            )}
            {noteSections.inspection.length > 0 && (
              <div
                style={{
                  padding: 14,
                  background: C.surface,
                  borderRadius: 8,
                  borderLeft: `3px solid ${C.textSub}`,
                }}
              >
                <div style={{ fontSize: 10, color: C.textSub, letterSpacing: 1.5, fontWeight: "bold", marginBottom: 10 }}>
                  検査詳細（{noteSections.inspection.length}項目）
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {noteSections.inspection.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        color: C.text,
                        padding: "6px 10px",
                        background: C.bg,
                        borderRadius: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ユーザー入力エリア */}
        <div
          style={{
            padding: 16,
            background: C.surface,
            borderRadius: 8,
            border: `1px solid ${C.orange}30`,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: C.orange,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 14,
              fontWeight: "bold",
            }}
          >
            自分の記録
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <div>
              <div style={lbl}>自分の入札額</div>
              <input
                style={inp}
                type="number"
                value={myBidPrice ?? ""}
                onChange={(e) =>
                  setMyBidPrice(e.target.value ? Number(e.target.value) : null)
                }
                placeholder="入札額を入力"
              />
            </div>
            <div>
              <div style={lbl}>入札結果</div>
              <select
                style={{ ...inp, cursor: "pointer" }}
                value={bidResult || ""}
                onChange={(e) => setBidResult((e.target.value || null) as BidResult | null)}
              >
                <option value="">-</option>
                <option value="won">落札（自分）</option>
                <option value="lost">負け</option>
                <option value="skipped">スキップ</option>
              </select>
            </div>
          </div>
          <div>
            <div style={lbl}>メモ</div>
            <textarea
              style={{ ...inp, minHeight: 80, resize: "vertical" }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="気になった点、状態、メモ"
            />
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          {record.source_url ? (
            <a
              href={record.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: C.blue,
                fontSize: 12,
                textDecoration: "underline",
              }}
            >
              → BDSページを開く
            </a>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={btn("ghost")} onClick={onClose}>
              閉じる
            </button>
            <button
              type="button"
              style={btn("primary")}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  highlight,
  span,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  highlight?: string
  span?: number
}) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <div style={lbl}>{label}</div>
      <div
        style={{
          fontSize: 13,
          color: highlight || C.text,
          fontFamily: mono ? "monospace" : "inherit",
          fontWeight: highlight ? "bold" : "normal",
        }}
      >
        {value || "-"}
      </div>
    </div>
  )
}
