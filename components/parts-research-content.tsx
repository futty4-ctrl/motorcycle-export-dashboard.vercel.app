"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { buildYahooSearchUrl, extractBdsLotNo } from "@/lib/yahoo-search"
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
  searched_at: string
}

export function PartsResearchContent() {
  const [bdsUrl, setBdsUrl] = useState("")
  const [makerSelect, setMakerSelect] = useState<string>("ホンダ")
  const [makerCustom, setMakerCustom] = useState("")
  const [productName, setProductName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [recent, setRecent] = useState<LogRow[]>([])

  const maker = makerSelect === "その他" ? makerCustom : makerSelect
  const lotNo = useMemo(() => extractBdsLotNo(bdsUrl), [bdsUrl])

  const previewKeyword = useMemo(() => {
    if (!maker.trim() || !productName.trim()) return ""
    return buildYahooSearchUrl(maker.trim(), productName.trim()).keyword
  }, [maker, productName])

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
    if (!maker.trim()) {
      toast.error("メーカーを入力してください")
      return
    }
    if (!productName.trim()) {
      toast.error("商品名を入力してください")
      return
    }
    setSubmitting(true)
    const { url, keyword } = buildYahooSearchUrl(maker.trim(), productName.trim())

    // 先にタブを開く（ボタン直押しでないとブラウザがブロックすることがあるため）
    const newWin = window.open(url, "_blank", "noopener,noreferrer")
    if (!newWin) {
      toast.error("ポップアップがブロックされました")
    }

    try {
      const res = await fetch("/api/parts-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bds_url: bdsUrl.trim() || null,
          bds_lot_no: lotNo,
          maker: maker.trim(),
          product_name: productName.trim(),
          search_keyword: keyword,
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
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleQuickReSearch = (row: LogRow) => {
    const { url } = buildYahooSearchUrl(row.maker, row.product_name)
    window.open(url, "_blank", "noopener,noreferrer")
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
        BDSパーツ → ヤフオク終了済み相場をワンタップ検索。履歴は10件保存。
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
          <div style={lbl}>メーカー *</div>
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
          <div style={lbl}>商品名 *</div>
          <input
            style={{ ...inp, fontSize: 14 }}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="例: モンキー純正タンク／中"
          />
          {previewKeyword && (
            <div style={{ marginTop: 6, fontSize: 11, color: C.textMuted }}>
              検索キーワード: <span style={{ color: C.text }}>{previewKeyword}</span>
            </div>
          )}
        </div>

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
