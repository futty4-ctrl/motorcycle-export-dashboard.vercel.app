"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
  buildYahooSearchUrl,
  buildYahooSearchUrlByTypeCode,
  buildYahooSearchUrlByName,
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

const QUICK_PARTS = [
  "外装",
  "エンジン",
  "マフラー",
  "ホイール",
  "シート",
  "メーター",
  "タンク",
  "カウル",
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
  const [pasteName, setPasteName] = useState("")

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

  // 履歴から型式上位5件抽出
  const frequentTypeCodes = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of recent) {
      const code = r.search_keyword.match(/^[A-Z0-9]{3,8}/)?.[0]
      if (code) map.set(code, (map.get(code) ?? 0) + 1)
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code)
  }, [recent])

  // 履歴チップ（重複排除した直近の組み合わせ最大8件）
  const recentChips = useMemo(() => {
    const seen = new Set<string>()
    const out: LogRow[] = []
    for (const r of recent) {
      const key = `${r.search_keyword}`.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(r)
      if (out.length >= 8) break
    }
    return out
  }, [recent])

  const handleMatrixClick = async (typeCodeLocal: string, partCat: string) => {
    const built = buildYahooSearchUrlByTypeCode(typeCodeLocal, partCat)
    window.open(built.url, "_blank", "noopener,noreferrer")
    try {
      await fetch("/api/parts-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker: "未指定",
          product_name: partCat,
          search_keyword: built.keyword,
          notes: `クイック検索: ${typeCodeLocal} × ${partCat}`,
        }),
      })
      void loadRecent()
    } catch {
      // 履歴保存失敗は無視
    }
  }

  const handlePasteSearch = async () => {
    const raw = pasteName.trim()
    if (!raw) {
      toast.error("商品名を貼り付けてください")
      return
    }
    const built = buildYahooSearchUrlByName(raw)
    if (!built.keyword) {
      toast.error("商品名から有効な検索キーワードが作れませんでした")
      return
    }
    window.open(built.url, "_blank", "noopener,noreferrer")
    try {
      await fetch("/api/parts-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker: "未指定",
          product_name: built.keyword,
          search_keyword: built.keyword,
          notes: `BDS商品名そのまま検索: ${raw}`,
        }),
      })
      void loadRecent()
      setPasteName("")
    } catch {
      // 履歴保存失敗は無視
    }
  }

  const handleChipClick = (row: LogRow) => {
    const codeMatch = row.search_keyword.match(/^[A-Z0-9]{3,8}/)
    const built = codeMatch
      ? buildYahooSearchUrlByTypeCode(codeMatch[0], row.product_name)
      : buildYahooSearchUrl(row.maker, row.product_name)
    window.open(built.url, "_blank", "noopener,noreferrer")
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

      {/* ── 商品名そのまま貼り付け検索 ── */}
      <div style={{ ...card(), borderTop: `3px solid ${C.green}` }}>
        <div style={{ ...lbl, marginBottom: 10, color: C.green }}>
          ⚡ BDS商品名をそのまま貼り付けて検索（最速）
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inp, fontSize: 14, flex: 1 }}
            value={pasteName}
            onChange={(e) => setPasteName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handlePasteSearch()
            }}
            placeholder="例: フォルツァ4社外マフラー／中"
          />
          <button
            onClick={() => void handlePasteSearch()}
            style={{
              background: C.green,
              border: "none",
              color: "#fff",
              borderRadius: 8,
              padding: "0 20px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: font,
              minWidth: 100,
            }}
          >
            🔍 検索
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>
          末尾の「／中・／良」や先頭の番号は自動で除去します
        </div>
      </div>

      {/* ── クイック検索: 履歴チップ ── */}
      {recentChips.length > 0 && (
        <div style={card()}>
          <div style={{ ...lbl, marginBottom: 10 }}>
            ⚡ 直近の検索（タップで再検索）
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {recentChips.map((row) => (
              <button
                key={row.id}
                onClick={() => handleChipClick(row)}
                style={{
                  background: `${C.orange}12`,
                  border: `1px solid ${C.orange}50`,
                  color: C.orange,
                  borderRadius: 999,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: font,
                  whiteSpace: "nowrap",
                }}
              >
                🔍 {row.search_keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── クイック検索: 型式×パーツ マトリクス ── */}
      {frequentTypeCodes.length > 0 && (
        <div style={card()}>
          <div style={{ ...lbl, marginBottom: 10 }}>
            ⚡ よく使う型式 × パーツ区分（タップで検索）
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                fontSize: 12,
                minWidth: "100%",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "8px 10px",
                      borderBottom: `1px solid ${C.border}`,
                      color: C.textMuted,
                      textAlign: "left",
                      fontSize: 10,
                      letterSpacing: 1.5,
                    }}
                  >
                    型式
                  </th>
                  {QUICK_PARTS.map((p) => (
                    <th
                      key={p}
                      style={{
                        padding: "8px 6px",
                        borderBottom: `1px solid ${C.border}`,
                        color: C.textMuted,
                        textAlign: "center",
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                    >
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {frequentTypeCodes.map((code) => (
                  <tr key={code}>
                    <td
                      style={{
                        padding: "6px 10px",
                        borderBottom: `1px solid ${C.border}40`,
                        fontFamily: font,
                        fontWeight: 700,
                        color: C.text,
                      }}
                    >
                      {code}
                    </td>
                    {QUICK_PARTS.map((p) => (
                      <td
                        key={p}
                        style={{
                          padding: "4px 4px",
                          borderBottom: `1px solid ${C.border}40`,
                          textAlign: "center",
                        }}
                      >
                        <button
                          onClick={() => handleMatrixClick(code, p)}
                          title={`${code} ${p}`}
                          style={{
                            background: "transparent",
                            border: `1px solid ${C.border}`,
                            color: C.textSub,
                            borderRadius: 6,
                            width: 36,
                            height: 32,
                            cursor: "pointer",
                            fontFamily: font,
                            fontSize: 14,
                          }}
                        >
                          🔍
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: C.textMuted }}>
            ※検索履歴の上位5型式から自動表示
          </div>
        </div>
      )}

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
