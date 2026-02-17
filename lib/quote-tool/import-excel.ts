/**
 * 見積書 Excel (.xlsx) から読み込むユーティリティ
 * 本アプリでエクスポートした形式、または同じ構成のシートを想定
 */

import type { QuoteLine, QuoteGroup } from "./types"

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

const HEADER_摘要 = "摘要"
const HEADER_数量 = "数量"
const HEADER_単価 = "単価"
const HEADER_金額 = "金額"
const FOOTER_小計 = "小計"
const FOOTER_消費税 = "消費税"
const FOOTER_合計 = "合計"

function toNum(v: unknown): number {
  if (v == null || v === "") return 0
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim())
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

function toString(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "string") return v.trim()
  if (typeof v === "number") return String(v)
  return String(v).trim()
}

/** インポート結果 */
export type QuoteImportResult = {
  ok: true
  groups: QuoteGroup[]
  lines: QuoteLine[]
  /** 読み取った税込合計（目標にセットする用） */
  totalInclTax: number | null
}

export type QuoteImportError = {
  ok: false
  message: string
}

/**
 * 見積書 Excel ファイルをパースして groups / lines を返す
 * エクスポート形式: グループ名 → 摘要/数量/単価/金額 → データ行… → 空行 → 次のグループ
 */
export async function parseQuoteFromExcel(file: File): Promise<QuoteImportResult | QuoteImportError> {
  const XLSX = await import("xlsx")

  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: "array", cellDates: false })
  const firstSheet = wb.Sheets[wb.SheetNames[0]]
  if (!firstSheet) {
    return { ok: false, message: "シートがありません" }
  }

  const aoa: unknown[][] = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][]

  if (!aoa.length) {
    return { ok: false, message: "データが空です" }
  }

  const groups: QuoteGroup[] = []
  const lines: QuoteLine[] = []
  let totalInclTax: number | null = null
  let currentGroupId: string | null = null
  let currentGroupLabel = ""
  let order = 0

  for (let i = 0; i < aoa.length; i++) {
    const row = aoa[i]
    if (!Array.isArray(row)) continue

    const c0 = toString(row[0])
    const c1 = toString(row[1])
    const c2 = toString(row[2])
    const c3 = toNum(row[3])

    // 合計行で終了
    if (c0.includes("合計") && (c0.includes("税込") || c0.includes("税込み"))) {
      totalInclTax = toNum(row[3]) || toNum(row[1]) || null
      break
    }
    if (c0.includes("小計") || c0.includes("消費税")) continue

    // ヘッダー行「摘要, 数量, 単価, 金額」→ 直前の行をグループ名として登録（空なら「セクションN」）
    if (
      (c0 === HEADER_摘要 || c0 === "項目" || c0 === "品名") &&
      (c1 === HEADER_数量 || c1 === "数量" || c2 === HEADER_単価 || c2 === "単価")
    ) {
      const prev = aoa[i - 1]
      const prev0 = prev && Array.isArray(prev) ? toString(prev[0]) : ""
      const label =
        prev0 && prev0 !== HEADER_摘要 && !prev0.includes("見積") && !prev0.includes("見積日")
          ? prev0
          : groups.length === 0
            ? "インポート"
            : `セクション${groups.length + 1}`
      currentGroupLabel = label
      const id = uid()
      currentGroupId = id
      groups.push({ id, label: currentGroupLabel, order: order++ })
      continue
    }

    // データ行: 1列目にラベルがあり、4列目に金額がある（または2,3列で単価・数量）
    const amount = toNum(row[3])
    const quantity = toNum(row[1])
    const unitPrice = toNum(row[2])

    if (!currentGroupId) continue
    if (!c0 || (amount === 0 && quantity === 0 && unitPrice === 0 && !c0)) continue

    const lineType: QuoteLine["type"] =
      quantity > 0 && unitPrice > 0 ? "unit" : amount !== 0 ? "fixed" : "unit"
    const lineAmount = amount !== 0 ? amount : quantity * unitPrice

    const line: QuoteLine = {
      id: uid(),
      label: c0,
      type: lineType,
      quantity: quantity || 1,
      unitPrice: unitPrice,
      amount: lineAmount,
      groupId: currentGroupId,
    }
    lines.push(line)
  }

  if (groups.length === 0) {
    return { ok: false, message: "グループ（セクション）が見つかりません。見積書形式で「摘要・数量・単価・金額」の表があるシートを選んでください。" }
  }

  if (lines.length === 0) {
    return { ok: false, message: "明細行が1行も見つかりませんでした。" }
  }

  // 最後のグループに調整行を1つ追加（逆算で使う）
  const lastGroupId = groups[groups.length - 1].id
  lines.push({
    id: uid(),
    label: "調整",
    type: "adjustment",
    quantity: 0,
    unitPrice: 0,
    amount: 0,
    groupId: lastGroupId,
  })

  return {
    ok: true,
    groups,
    lines,
    totalInclTax,
  }
}
