"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
  buildYahooSearchUrl,
  buildYahooSearchUrlByTypeCode,
  extractBdsLotNo,
  normalizeTypeCode,
} from "@/lib/yahoo-search"
import {
  calcPartsBidLimit,
  YAHOO_FEE_RATE,
  PARTS_TARGET_PROFIT,
} from "@/lib/bds-parts-fees"
import { lookupBikeTypeFromDb } from "@/lib/bike-type-codes-supabase"
import {
  C,
  font,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  lbl,
  inp,
  badge,
} from "@/components/ui-system"

const FIXED_MAKERS = [
  "ホンダ",
  "カワサキ",
  "ヤマハ",
  "スズキ",
  "KTM",
  "ハーレー",
  "その他",
] as const

type LogRow = {
  id: string
  bds_url: string | null
  bds_lot_no: string | null
  maker: string
  product_name: string
  search_keyword: string
  yahoo_median_price: number | null
  bid_limit: number | null
  decision: "go" | "hold" | "pass" | null
  searched_at: string
}

const fmt = (n: number) => `¥${n.toLocaleString()}`

export function PartsResearchContent() {
  const [bdsUrl, setBdsUrl] = useState("")
  const [typeCode, setTypeCode] = useState("")
  const [makerSelect, setMakerSelect] = useState<string>("ホンダ")
  const [makerCustom, setMakerCustom] = useState("")
  const [resolvedModel, setResolvedModel] = useState<string>("")
  const [productName, setProductName] = useState("")
  const [estimatedPrice, setEstimatedPrice] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [recent, setRecent] = useState<LogRow[]>([])
  const [lookupLoading, setLookupLoading] = useState(false)

  const maker = makerSelect === "その他" ? makerCustom : makerSelect
  const lotNo = useMemo(() => extractBdsLotNo(bdsUrl), [bdsUrl])
  const normalizedCode = useMemo(() => normalizeTypeCode(typeCode), [typeCode])

  // 型式 → 車種名自動補完
  useEffect(() => {
    if (!normalizedCode || normalizedCode.length < 3) {
      setResolvedModel("")
      return
    }
    let cancelled = false
    setLookupLoading(true)
    lookupBikeTypeFromDb(normalizedCode).then((row) => {
      if (cancelled) return
      setLookupLoading(false)
      if (row) {
        setResolvedModel(`${row.maker} ${row.model}`)
        if (FIXED_MAKERS.includes(row.maker as (typeof FIXED_MAKERS)[number])) {
          setMakerSelect(row.maker)
        }
      } else {
        setResolvedModel("")
      }
    })
    return () => {
      cancelled = true
    }
  }, [normalizedCode])

  const previewKeyword = useMemo(() => {
    if (normalizedCode && productName.trim()) {
      return buildYahooSearchUrlByTypeCode(normalizedCode, productName.trim())
        .keyword
    }
    if (maker.trim() && productName.trim()) {
      return buildYahooSearchUrl(maker.trim(), productName.trim()).keyword
    }
    return ""
  }, [normalizedCode, maker, productName])

  const bidLimitResult = useMemo(() => {
    const price = parseInt(estimatedPrice, 10)
    if (!price || price <= 0) return null
    return calcPartsBidLimit(price)
  }, [estimatedPrice])

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/parts-research")
      const json = await res.json()
      if (res.ok) setRecent(json.data ?? [])
    } catch {
      // 無視
    }
  }, [])

  useEffect(() => {
    void loadRecent()
  }, [loadRecent])

  const handleSearch = async () => {
    if (!productName.trim()) {
      toast.error("パーツ名を入力してください")
      return
    }
    if (!normalizedCode && !maker.trim()) {
      toast.error("型式またはメーカーを入力してください")
      return
    }

    const built = normalizedCode
      ? buildYahooSearchUrlByTypeCode(normalizedCode, productName.trim())
      : buildYahooSearchUrl(maker.trim(), productName.trim())

    const newWin = window.open(built.url, "_blank", "noopener,noreferrer")
    if (!newWin) {
      toast.error("ポップアップがブロックされました")
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/parts-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bds_url: bdsUrl.trim() || null,
          bds_lot_no: lotNo,
          maker: maker.trim() || resolvedModel.split(" ")[0] || "未指定",
          product_name: productName.trim(),
          search_keyword: built.keyword,
          bid_limit: bidLimitResult?.bidLimit ?? null,
          notes: normalizedCode ? `型式: ${normalizedCode}` : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "履歴保存失敗")
      } else {
        toast.success("検索しました")
        await loadRecent()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "通信失敗")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestore = (row: LogRow) => {
    if (FIXED_MAKERS.includes(row.maker as (typeof FIXED_MAKERS)[number])) {
      setMakerSelect(row.maker)
      setMakerCustom("")
    } else {
      setMakerSelect("その他")
      setMakerCustom(row.maker)
    }
    setProductName(row.product_name)
    setBdsUrl(row.bds_url ?? "")
    const codeMatch = row.search_keyword.match(/^[A-Z0-9]{3,8}/)
    if (codeMatch) setTypeCode(codeMatch[0])
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleQuickReSearch = (row: LogRow) => {
    const codeMatch = row.search_keyword.match(/^[A-Z0-9]{3,8}/)
    const built = codeMatch
      ? buildYahooSearchUrlByTypeCode(codeMatch[0], row.product_name)
      : buildYahooSearchUrl(row.maker, row.product_name)
    window.open(built.url, "_blank", "noopener,noreferrer")
  }

  return (
    <div
      style={{
        ...pageWrapper,
        padding: "20px 16px",
        maxWidth: 720,
      }}
    >
      <div style={{ ...pageTitle, fontSize: 20 }}>パーツ相場リサーチ</div>
      <div style={{ ...pageSub, marginBottom: 16 }}>
        型式コード主軸でヤフオク終了済み相場を検索 → 入札上限を即時表示
      </div>

      <div style={card()}>
        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>BDS商品URL（任意）</div>
          <input
            style={{ ...inp, fontSize: 14 }}
            value={bdsUrl}
            onChange={(e) => setBdsUrl(e.target.value)}
            placeholder="https://www.bds-net.co.jp/..."
            inputMode="url"
          />
          {lotNo && (
            <div style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>
              ロット: <span style={badge(C.blue)}>{lotNo}</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>型式コード（推奨）</div>
          <input
            style={{ ...inp, fontSize: 14, fontFamily: font, fontWeight: 700 }}
            value={typeCode}
            onChange={(e) => setTypeCode(e.target.value)}
            placeholder="例: SE44J / CF4MA / AB27"
          />
          <div style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>
            {lookupLoading ? (
              "検索中…"
            ) : resolvedModel ? (
              <>
                <span style={badge(C.green)}>{normalizedCode}</span>{" "}
                <span style={{ color: C.text }}>→ {resolvedModel}</span>
              </>
            ) : normalizedCode ? (
              <>
                <span style={badge(C.yellow)}>{normalizedCode}</span>{" "}
                <span style={{ color: C.textMuted }}>
                  マスター未登録（型式そのままで検索します）
                </span>
              </>
            ) : (
              "型式を入力すると車種名を自動補完"
            )}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>メーカー（型式不明時のフォールバック）</div>
          <select
            style={{ ...inp, fontSize: 14, height: 44 }}
            value={makerSelect}
            onChange={(e) => setMakerSelect(e.target.value)}
          >
            {FIXED_MAKERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {makerSelect === "その他" && (
            <input
              style={{ ...inp, fontSize: 14, marginTop: 8 }}
              value={makerCustom}
              onChange={(e) => setMakerCustom(e.target.value)}
              placeholder="メーカー名を入力（例: BMW）"
            />
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>パーツ名 *</div>
          <input
            style={{ ...inp, fontSize: 14 }}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="例: タンク純正 / フロントフォーク"
          />
          {previewKeyword && (
            <div style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>
              検索キーワード: <span style={{ color: C.text }}>{previewKeyword}</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>想定売価（任意・入札上限計算用）</div>
          <input
            style={{ ...inp, fontSize: 14 }}
            type="number"
            value={estimatedPrice}
            onChange={(e) => setEstimatedPrice(e.target.value)}
            placeholder="ヤフオクで売れる想定額"
            inputMode="numeric"
          />
        </div>

        {bidLimitResult && (
          <div
            style={{
              background: C.bg,
              border: `1px solid ${
                bidLimitResult.warning ? C.red : C.green
              }60`,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            <div
              style={{
                ...lbl,
                color: bidLimitResult.warning ? C.red : C.green,
                marginBottom: 8,
              }}
            >
              入札上限プレビュー
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ color: C.textSub }}>想定売価</span>
              <span>{fmt(parseInt(estimatedPrice, 10))}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
                color: C.textMuted,
              }}
            >
              <span>− ヤフオク手数料 ({(YAHOO_FEE_RATE * 100).toFixed(2)}%)</span>
              <span>
                −{fmt(parseInt(estimatedPrice, 10) - bidLimitResult.yahooNet)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
                color: C.textMuted,
              }}
            >
              <span>− BDS落札料</span>
              <span>−{fmt(bidLimitResult.bdsHammerFee)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                color: C.textMuted,
              }}
            >
              <span>− 目標利益</span>
              <span>−{fmt(PARTS_TARGET_PROFIT)}</span>
            </div>
            <div
              style={{
                borderTop: `1px solid ${C.border}`,
                paddingTop: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 700 }}>入札上限</span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: bidLimitResult.warning ? C.red : C.green,
                  fontFamily: font,
                }}
              >
                {fmt(bidLimitResult.bidLimit)}
              </span>
            </div>
            {bidLimitResult.warning && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: C.red,
                }}
              >
                ⚠ {bidLimitResult.warning}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={submitting}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 8,
            border: "none",
            background: submitting ? `${C.orange}80` : C.orange,
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: font,
            cursor: submitting ? "default" : "pointer",
            letterSpacing: 0.5,
          }}
        >
          {submitting ? "検索中…" : "🔍 ヤフオクで相場検索"}
        </button>
      </div>

      <div style={card()}>
        <div style={{ ...lbl, marginBottom: 12 }}>直近の検索（最大10件）</div>
        {recent.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textMuted, padding: "12px 0" }}>
            履歴なし
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map((row) => (
              <div
                key={row.id}
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.maker} / {row.product_name}
                    {row.bid_limit != null && (
                      <span
                        style={{
                          ...badge(C.green),
                          fontSize: 10,
                          marginLeft: 6,
                        }}
                      >
                        上限 {fmt(row.bid_limit)}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: C.textMuted,
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.search_keyword} ・{" "}
                    {new Date(row.searched_at).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button
                    onClick={() => handleQuickReSearch(row)}
                    style={{
                      background: `${C.orange}18`,
                      border: `1px solid ${C.orange}40`,
                      color: C.orange,
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: font,
                    }}
                  >
                    再検索
                  </button>
                  <button
                    onClick={() => handleRestore(row)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.border}`,
                      color: C.textSub,
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: font,
                    }}
                  >
                    復元
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
