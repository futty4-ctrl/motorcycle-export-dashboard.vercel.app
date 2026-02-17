/**
 * 請求書・見積を Excel (.xlsx) でダウンロードするユーティリティ
 * クライアントでのみ使用（dynamic import で xlsx を読み込む想定）
 */

/** 請求書1行 */
export type InvoiceRow = {
  description: string
  quantity: string | number
  unit?: string
  unitPrice: number
  amount: number
}

/** 請求書エクスポート用データ */
export type InvoiceExportData = {
  issueDate: string
  billTo: string
  subject: string
  bank?: {
    name: string
    branch: string
    branchCode: string
    accountType: string
    accountNumber: string
    accountName: string
  }
  address?: string
  postalCode?: string
  tel?: string
  companyName?: string
  companyAddress?: string
  rows: InvoiceRow[]
  note?: string
}

/** 見積エクスポート用（グループ・明細・合計） */
export type QuoteExportData = {
  billToName?: string
  billToAddress?: string
  companyName?: string
  companyAddress?: string
  note?: string
  validUntil?: string
  groups: { id: string; label: string; order: number }[]
  linesByGroup: Map<string, { id: string; label: string; quantity: number; unitPrice: number; amount: number }[]>
  subtotal: number
  tax: number
  totalInclTax: number
}

/**
 * 請求書データを Excel でダウンロード
 */
export async function exportInvoiceToExcel(data: InvoiceExportData, filename = "請求書.xlsx"): Promise<void> {
  const XLSX = await import("xlsx")

  const rows: (string | number)[][] = [
    ["御請求書"],
    [],
    ["請求日", data.issueDate],
    ["請求先", data.billTo],
    ["件名", data.subject],
    [],
  ]

  if (data.companyName ?? data.companyAddress) {
    const issuer = [data.companyName, data.companyAddress].filter(Boolean).join("\n")
    if (issuer) rows.push(["発行元", issuer], [])
  }

  if (data.bank) {
    rows.push(
      ["振込先", `${data.bank.name} ${data.bank.branch}（店番${data.bank.branchCode})`],
      ["口座", `${data.bank.accountType} ${data.bank.accountNumber} ${data.bank.accountName}`],
      []
    )
  }
  if (data.address ?? data.postalCode ?? data.tel) {
    const addr = [data.postalCode, data.address, data.tel].filter(Boolean).join(" ")
    if (addr) rows.push(["住所・連絡先", addr], [])
  }

  rows.push(["摘要", "数量", "単位", "単価", "金額"])
  for (const row of data.rows) {
    rows.push([
      row.description,
      typeof row.quantity === "number" ? row.quantity : row.quantity,
      row.unit ?? "",
      row.unitPrice,
      row.amount,
    ])
  }

  const subtotal = data.rows.reduce((s, r) => s + r.amount, 0)
  rows.push([], ["小計", "", "", "", subtotal], ["合計（税込）", "", "", "", subtotal])
  rows.push([])
  rows.push(["備考", data.note ?? ""])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "請求書")
  XLSX.writeFile(wb, filename)
}

/**
 * 見積データを Excel でダウンロード
 */
export async function exportQuoteToExcel(data: QuoteExportData, filename = "見積書.xlsx"): Promise<void> {
  const XLSX = await import("xlsx")

  const rows: (string | number)[][] = [
    ["見積書"],
    [],
    ["見積日", new Date().toLocaleDateString("ja-JP")],
    ...(data.validUntil?.trim() ? [["有効期限", data.validUntil.trim()]] : []),
    [],
  ]
  if (data.billToName?.trim()) {
    rows.push(["宛名", data.billToName.trim()], [])
  }
  if (data.billToAddress?.trim()) {
    rows.push(["宛先住所", data.billToAddress.trim()], [])
  }
  if (data.companyName ?? data.companyAddress) {
    const issuer = [data.companyName, data.companyAddress].filter(Boolean).join("\n")
    if (issuer) rows.push(["発行元", issuer], [])
  }

  const sortedGroups = [...data.groups].sort((a, b) => a.order - b.order)
  for (const group of sortedGroups) {
    const lines = data.linesByGroup.get(group.id) ?? []
    if (lines.length === 0) continue
    rows.push([group.label])
    rows.push(["摘要", "数量", "単価", "金額"])
    for (const line of lines) {
      rows.push([
        line.label,
        line.quantity,
        line.unitPrice,
        line.amount,
      ])
    }
    rows.push([])
  }

  rows.push(["小計（税抜）", "", "", data.subtotal])
  rows.push(["消費税（10%）", "", "", data.tax])
  rows.push(["合計（税込）", "", "", data.totalInclTax])
  rows.push([])
  rows.push(["備考", data.note ?? ""])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "見積書")
  XLSX.writeFile(wb, filename)
}
