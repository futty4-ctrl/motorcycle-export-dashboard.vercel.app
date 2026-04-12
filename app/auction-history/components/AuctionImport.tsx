"use client"

import { useState } from "react"
import { C, card, lbl, inp, btn, badge } from "@/components/ui-system"
import type { AuctionHistoryRecord } from "@/types/auction-history"

// メーカーコード → メーカー名
const MAKER_MAP: Record<string, string> = {
  H: "ホンダ",
  Y: "ヤマハ",
  S: "スズキ",
  K: "カワサキ",
  B: "BMW",
  D: "ドゥカティ",
  T: "トライアンフ",
  A: "アプリリア",
  P: "ピアジオ",
  KT: "KTM",
  HQ: "ハスクバーナ",
  HD: "ハーレー",
  I: "インディアン",
}

// 和暦 → 西暦
function wareToYear(w: string): string {
  if (!w) return ""
  const m = w.match(/^(S|H|R|昭|平|令)\s*(\d+)$/)
  if (!m) return w
  const era = m[1]
  const num = parseInt(m[2], 10)
  if (era === "S" || era === "昭") return String(1925 + num)
  if (era === "H" || era === "平") return String(1988 + num)
  if (era === "R" || era === "令") return String(2018 + num)
  return w
}

interface ParsedRow {
  region: string
  auction_type: "蚤の市" | "定例"
  lot_number: string
  maker_code: string
  maker_name: string
  model_name: string
  chassis_number: string
  displacement_cc: number | null
  first_registration: string
  inspection: string
  mileage_km: number | null
  color: string
  score_total: number | null
  score_engine: number | null
  score_frame: number | null
  score_exterior: number | null
  score_rear: number | null
  score_electrical: number | null
  score_body: number | null
  start_price: number | null
  result_status: "sold" | "unsold" | "unknown"
  sold_price: number | null
}

function parseBdsText(text: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    // 各行は「関西 定例」or「関西 蚤の市」で始まる
    const m = line.match(
      /^(関[東西]|東北|九州|中部|北海道|四国|中国)\s+(定例|蚤の市)\s+([A-Z])\s+(\d+)\s+([A-Z]{1,2})\s+(.+)$/
    )
    if (!m) continue

    const region = m[1]
    const auction_type = m[2] as "蚤の市" | "定例"
    const lot_prefix = m[3]
    const lot_num = m[4]
    const lot_number = `${lot_prefix} ${lot_num}`
    const maker_code = m[5]
    const rest = m[6]

    // restを解析: 車名 車台番号 排気量cc 初年 車検 走行距離K 色 [7スコア] スタート [売切] [予約] 結果
    // 正規表現で段階的に取る
    const p = rest.match(
      /^(\S+)\s+(\S+)\s+(\d+)cc\s+(.*?)\s+([\d,]+)K\s+(\S+)\s+(.*?)(\d[\d,]*|0)\s+(.*?)(落|流)\s+([\d,]+).*$/
    )

    if (!p) {
      // スコアなし（蚤の市パターン or 結果なしパターン）
      const p2 = rest.match(
        /^(\S+)\s+(\S+)\s+(\d+)cc\s+(.*?)\s+([\d,]+)K\s+(\S+)\s+(.*?)(落|流)\s+([\d,]+).*$/
      )
      if (p2) {
        rows.push({
          region,
          auction_type,
          lot_number,
          maker_code,
          maker_name: MAKER_MAP[maker_code] || maker_code,
          model_name: p2[1],
          chassis_number: p2[2],
          displacement_cc: parseInt(p2[3], 10) || null,
          first_registration: "",
          inspection: "",
          mileage_km: parseInt(p2[5].replace(/,/g, ""), 10) || null,
          color: p2[6],
          score_total: null,
          score_engine: null,
          score_frame: null,
          score_exterior: null,
          score_rear: null,
          score_electrical: null,
          score_body: null,
          start_price: null,
          result_status: p2[8] === "落" ? "sold" : "unsold",
          sold_price: parseInt(p2[9].replace(/,/g, ""), 10) || null,
        })
      }
      continue
    }

    rows.push({
      region,
      auction_type,
      lot_number,
      maker_code,
      maker_name: MAKER_MAP[maker_code] || maker_code,
      model_name: p[1],
      chassis_number: p[2],
      displacement_cc: parseInt(p[3], 10) || null,
      first_registration: p[4].trim(),
      inspection: "",
      mileage_km: parseInt(p[5].replace(/,/g, ""), 10) || null,
      color: p[6],
      score_total: null,
      score_engine: null,
      score_frame: null,
      score_exterior: null,
      score_rear: null,
      score_electrical: null,
      score_body: null,
      start_price: parseInt(p[8].replace(/,/g, ""), 10) || null,
      result_status: p[10] === "落" ? "sold" : "unsold",
      sold_price: parseInt(p[11].replace(/,/g, ""), 10) || null,
    })
  }

  return rows
}

// もっと柔軟なパーサー（タブ区切り or 複数空白で分割）
function parseBdsTextV2(text: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    // 「関西 定例」or「関西 蚤の市」を含む行だけ処理
    if (!/(定例|蚤の市)/.test(line)) continue
    // 「落 」or「流 」を含まない行はスキップ（結果なし）
    // ただし結果なし行も取り込みたいので軽くチェック
    if (!/(落|流)\s+[\d,]+/.test(line) && !/📊/.test(line)) continue

    // タブ or 連続空白で分割
    const parts = line
      .replace(/📊\s*記録/g, "")
      .replace(/セリ終了/g, "")
      .split(/\t+|\s{2,}/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (parts.length < 6) continue

    // パーツを走査して構造化
    let region = ""
    let auction_type: "蚤の市" | "定例" = "定例"
    let lot_number = ""
    let maker_code = ""
    let model_name = ""
    let chassis_number = ""
    let displacement_cc: number | null = null
    let first_registration = ""
    let inspection = ""
    let mileage_km: number | null = null
    let color = ""
    const scores: number[] = []
    let start_price: number | null = null
    let result_status: "sold" | "unsold" | "unknown" = "unknown"
    let sold_price: number | null = null

    // 最初のパート: 「関西 定例」or「関西 蚤の市」
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]

      // 主催 + 会場
      if (/(定例|蚤の市)/.test(p)) {
        const m = p.match(/(関[東西]|東北|九州|中部|北海道|四国|中国)?\s*(定例|蚤の市)/)
        if (m) {
          region = m[1] || ""
          auction_type = m[2] as "蚤の市" | "定例"
        }
        continue
      }

      // 出番: B 4237, C 5336, D 7731 パターン
      if (/^[A-Z]\s+\d{4}$/.test(p)) {
        lot_number = p
        continue
      }

      // メーカーコード: 1-2文字の英字（車名の直前）
      if (/^[A-Z]{1,2}$/.test(p) && !maker_code && lot_number) {
        maker_code = p
        continue
      }

      // 排気量: 数字cc
      if (/^\d+cc$/.test(p)) {
        displacement_cc = parseInt(p, 10)
        continue
      }

      // 走行距離: 数字K
      if (/^[\d,]+K$/.test(p)) {
        mileage_km = parseInt(p.replace(/,/g, "").replace("K", ""), 10)
        continue
      }

      // 初年度: H25, R4, S63 など
      if (/^[HSR]\d{1,2}$/.test(p)) {
        first_registration = wareToYear(p)
        continue
      }

      // 車検: R 数字/数字 パターン
      if (/^R\s*\d+\/\s*\d+$/.test(p)) {
        inspection = p
        continue
      }

      // 結果: 落 376,000 / 流 134,000
      const resultMatch = p.match(/^(落|流)\s+([\d,]+)$/)
      if (resultMatch) {
        result_status = resultMatch[1] === "落" ? "sold" : "unsold"
        sold_price = parseInt(resultMatch[2].replace(/,/g, ""), 10) || null
        continue
      }

      // スコア: 0-10の1-2桁数字が並ぶ場所
      if (/^\d{1,2}$/.test(p) && parseInt(p, 10) <= 10 && scores.length < 7) {
        scores.push(parseInt(p, 10))
        continue
      }

      // 価格っぽい数字（カンマ付き or 0）
      if (/^[\d,]+$/.test(p) && !start_price && lot_number) {
        const n = parseInt(p.replace(/,/g, ""), 10)
        if (n >= 0) {
          start_price = n
          continue
        }
      }

      // 車台番号: 英数字-数字パターン
      if (/^[A-Z]{2,}\d{2,}-\d+/.test(p) && !chassis_number) {
        chassis_number = p
        continue
      }

      // 車名: maker_code設定済み & model_nameまだ
      if (maker_code && !model_name && !/^[\d,]+$/.test(p)) {
        model_name = p
        continue
      }

      // 色: 日本語の色名（上記に当てはまらない日本語）
      if (
        /[\u3040-\u9FFF]/.test(p) &&
        !/(定例|蚤の市|落|流|セリ)/.test(p) &&
        model_name &&
        !color
      ) {
        color = p
        continue
      }
    }

    if (!model_name) continue

    rows.push({
      region,
      auction_type,
      lot_number,
      maker_code,
      maker_name: MAKER_MAP[maker_code] || maker_code,
      model_name,
      chassis_number,
      displacement_cc,
      first_registration,
      inspection,
      mileage_km,
      color,
      score_total: scores[0] ?? null,
      score_engine: scores[1] ?? null,
      score_frame: scores[2] ?? null,
      score_exterior: scores[3] ?? null,
      score_rear: scores[4] ?? null,
      score_electrical: scores[5] ?? null,
      score_body: scores[6] ?? null,
      start_price,
      result_status,
      sold_price,
    })
  }

  return rows
}

function formatPrice(n: number | null): string {
  if (n == null) return "-"
  return `¥${n.toLocaleString()}`
}

interface Props {
  onImported: () => void
}

export function AuctionImport({ onImported }: Props) {
  const [rawText, setRawText] = useState("")
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ ok: number; skip: number; err: number } | null>(null)
  const [auctionDate, setAuctionDate] = useState(
    new Date().toISOString().split("T")[0]
  )

  const handleParse = () => {
    const rows = parseBdsTextV2(rawText)
    setParsed(rows)
    setResult(null)
  }

  const handleImport = async () => {
    if (!parsed || parsed.length === 0) return
    setImporting(true)
    setResult(null)

    const records = parsed.map((r) => ({
      record_type: "history" as const,
      bds_lot_number: r.lot_number.replace(/\s+/g, ""),
      model_name: `${r.maker_name} ${r.model_name}`,
      chassis_number: r.chassis_number || null,
      engine_model: null,
      mileage_km: r.mileage_km,
      displacement_cc: r.displacement_cc,
      first_registration: r.first_registration || null,
      inspection: r.inspection || null,
      parts_included: [
        r.score_total != null ? `総${r.score_total}` : null,
        r.score_engine != null ? `E${r.score_engine}` : null,
        r.score_frame != null ? `F${r.score_frame}` : null,
        r.score_exterior != null ? `外${r.score_exterior}` : null,
        r.score_rear != null ? `R${r.score_rear}` : null,
        r.score_electrical != null ? `電${r.score_electrical}` : null,
        r.score_body != null ? `車${r.score_body}` : null,
      ]
        .filter(Boolean)
        .join(" ") || null,
      start_price: r.start_price,
      reserve_price: null,
      sold_price: r.sold_price,
      result_status: r.result_status,
      region: r.region || null,
      auction_type: r.auction_type,
      auction_date: auctionDate,
      market_sold_count: null,
      market_min_price: null,
      market_max_price: null,
      photo_urls: [],
      source_url: null,
      notes: r.color ? `色: ${r.color}` : "",
    }))

    try {
      const res = await fetch("/api/auction-history/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      })
      const data = await res.json()
      if (data.success) {
        setResult({ ok: data.inserted, skip: data.skipped, err: 0 })
        onImported()
      } else {
        setResult({ ok: 0, skip: 0, err: records.length })
        alert("取込に失敗しました: " + (data.error || "不明なエラー"))
      }
    } catch (e) {
      setResult({ ok: 0, skip: 0, err: records.length })
      alert("取込に失敗しました: " + (e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div style={card()}>
        <div style={{ fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 12 }}>
          BDS落札結果テキスト 一括取込
        </div>
        <p style={{ fontSize: 12, color: C.textSub, marginBottom: 14, lineHeight: 1.8 }}>
          BDSの下見検索結果ページで Ctrl+A → Ctrl+C して、下の欄に Ctrl+V で貼り付けてください。
          <br />
          1ページ約50件。21ページなら21回繰り返すことで全件取り込めます。
          <br />
          同じLot番号のデータは重複スキップされるので、何度貼っても安全です。
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-end" }}>
          <div>
            <div style={lbl}>オークション開催日</div>
            <input
              style={inp}
              type="date"
              value={auctionDate}
              onChange={(e) => setAuctionDate(e.target.value)}
            />
          </div>
          <button type="button" style={btn("primary")} onClick={handleParse}>
            解析する
          </button>
          {parsed && parsed.length > 0 && (
            <button
              type="button"
              style={{ ...btn("primary"), background: C.green }}
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? "取込中..." : `${parsed.length}件を取り込む`}
            </button>
          )}
        </div>

        <textarea
          style={{
            ...inp,
            minHeight: 200,
            maxHeight: 400,
            resize: "vertical",
            fontFamily: "monospace",
            fontSize: 11,
            lineHeight: 1.4,
          }}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value)
            setParsed(null)
            setResult(null)
          }}
          placeholder="BDSの下見検索結果をここに貼り付け..."
        />
      </div>

      {result && (
        <div
          style={{
            ...card(result.ok > 0 ? C.greenGlow : C.redGlow),
            display: "flex",
            gap: 16,
            alignItems: "center",
          }}
        >
          <span style={badge(C.green)}>{result.ok}件 取込成功</span>
          {result.skip > 0 && (
            <span style={badge(C.yellow)}>{result.skip}件 重複スキップ</span>
          )}
          {result.err > 0 && (
            <span style={badge(C.red)}>{result.err}件 エラー</span>
          )}
        </div>
      )}

      {parsed && parsed.length > 0 && (
        <div style={card()}>
          <div
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: C.text,
              marginBottom: 10,
            }}
          >
            プレビュー（{parsed.length}件）
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {["#", "会場", "Lot#", "メ", "車名", "車台番号", "cc", "初年", "走行", "色", "総", "E", "F", "外", "R", "電", "車", "スタート", "結果", "落札額"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: h === "落札額" || h === "スタート" || h === "走行" ? "right" : "left",
                          padding: "8px 6px",
                          fontSize: 10,
                          color: C.textMuted,
                          borderBottom: `1px solid ${C.border}`,
                          letterSpacing: 0.5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: "6px", color: C.textMuted, borderBottom: `1px solid ${C.border}20` }}>{i + 1}</td>
                    <td style={{ padding: "6px", borderBottom: `1px solid ${C.border}20`, whiteSpace: "nowrap" }}>
                      <span style={badge(r.auction_type === "蚤の市" ? C.yellow : C.blue)}>
                        {r.auction_type}
                      </span>
                    </td>
                    <td style={{ padding: "6px", fontFamily: "monospace", fontSize: 11, borderBottom: `1px solid ${C.border}20` }}>{r.lot_number}</td>
                    <td style={{ padding: "6px", borderBottom: `1px solid ${C.border}20` }}>{r.maker_code}</td>
                    <td style={{ padding: "6px", fontWeight: "bold", borderBottom: `1px solid ${C.border}20` }}>{r.model_name}</td>
                    <td style={{ padding: "6px", fontFamily: "monospace", fontSize: 11, borderBottom: `1px solid ${C.border}20` }}>{r.chassis_number || "-"}</td>
                    <td style={{ padding: "6px", borderBottom: `1px solid ${C.border}20` }}>{r.displacement_cc || "-"}</td>
                    <td style={{ padding: "6px", borderBottom: `1px solid ${C.border}20` }}>{r.first_registration || "-"}</td>
                    <td style={{ padding: "6px", textAlign: "right", fontFamily: "monospace", borderBottom: `1px solid ${C.border}20` }}>
                      {r.mileage_km != null ? `${r.mileage_km.toLocaleString()}` : "-"}
                    </td>
                    <td style={{ padding: "6px", borderBottom: `1px solid ${C.border}20` }}>{r.color || "-"}</td>
                    {[r.score_total, r.score_engine, r.score_frame, r.score_exterior, r.score_rear, r.score_electrical, r.score_body].map((s, j) => (
                      <td
                        key={j}
                        style={{
                          padding: "6px",
                          textAlign: "center",
                          fontFamily: "monospace",
                          color: s == null ? C.textMuted : s >= 7 ? C.green : s <= 3 ? C.red : C.text,
                          borderBottom: `1px solid ${C.border}20`,
                        }}
                      >
                        {s ?? "-"}
                      </td>
                    ))}
                    <td style={{ padding: "6px", textAlign: "right", fontFamily: "monospace", borderBottom: `1px solid ${C.border}20` }}>
                      {formatPrice(r.start_price)}
                    </td>
                    <td style={{ padding: "6px", borderBottom: `1px solid ${C.border}20` }}>
                      <span style={badge(r.result_status === "sold" ? C.green : r.result_status === "unsold" ? C.red : C.textMuted)}>
                        {r.result_status === "sold" ? "落札" : r.result_status === "unsold" ? "流札" : "-"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        fontWeight: "bold",
                        color: r.result_status === "sold" ? C.green : C.textMuted,
                        borderBottom: `1px solid ${C.border}20`,
                      }}
                    >
                      {formatPrice(r.sold_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 100 && (
              <div style={{ padding: 12, fontSize: 12, color: C.textSub, textAlign: "center" }}>
                ※ プレビューは先頭100件のみ表示。取込は全{parsed.length}件実行されます。
              </div>
            )}
          </div>
        </div>
      )}

      {parsed && parsed.length === 0 && (
        <div style={{ ...card(), textAlign: "center", padding: 32, color: C.textMuted }}>
          BDS形式のデータが見つかりませんでした。テキストを確認してください。
        </div>
      )}
    </div>
  )
}
