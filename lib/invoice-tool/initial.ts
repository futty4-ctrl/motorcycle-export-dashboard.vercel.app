import type { InvoiceState, InvoiceRow } from "./types"

/** 見積→請求書の受け渡し用 sessionStorage キー */
export const INVOICE_FROM_QUOTE_KEY = "invoiceFromQuote"

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

const DEFAULT_BANK = {
  name: "福岡銀行",
  branch: "藤崎支店",
  branchCode: "252",
  accountType: "普通",
  accountNumber: "1510241",
  accountName: "淵上 郁也",
}

const DEFAULT_ROWS: (Omit<InvoiceRow, "id"> & { unit?: string })[] = [
  { description: "作業費(淵上 ハーフ5日)", quantity: "7,000", unit: "式", unitPrice: 35_000, amount: 193_740 },
  { description: "作業費(小寺 1日8時間)", quantity: "1", unit: "式", unitPrice: 0, amount: -50_000 },
  { description: "家賃", quantity: "", unit: "ヶ月", unitPrice: 0, amount: -20_060 },
  { description: "先月の差額分", quantity: "", unit: "", unitPrice: 0, amount: 0 },
  { description: "備考", quantity: "", unit: "", unitPrice: 0, amount: 0 },
]

/** デフォルトの請求書状態（自由編集用） */
export function getInitialInvoiceState(): InvoiceState {
  const today = new Date()
  const issueDateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  return {
    issueDate: issueDateStr,
    billTo: "株式A-produce株式会社 御中",
    billToAddress: "〒570-0006\n大阪府守口市八雲西町2-1-27\nTEL： 090-6423-4268",
    subject: "作業代金",
    bank: { ...DEFAULT_BANK },
    rows: DEFAULT_ROWS.map((r) => ({ ...r, id: uid(), unit: r.unit ?? "" } as InvoiceRow)),
    note: "下記のとおり、領収申し上げます。",
    companyName: "",
    companyAddress: "〒570-0006\n大阪府守口市八雲西町2-1-27\nTEL： 090-6423-4268",
    sealImageDataUrl: "",
  }
}

/** 見積データから請求書の初期状態を生成（REPLACE_STATE 用） */
export type QuoteToInvoicePayload = {
  billTo: string
  billToAddress: string
  subject: string
  rows: { description: string; quantity: string | number; unit?: string; unitPrice: number; amount: number }[]
  note: string
  companyName: string
  companyAddress: string
  sealImageDataUrl: string
}

export function buildInvoiceStateFromQuote(payload: QuoteToInvoicePayload): Partial<InvoiceState> {
  const today = new Date()
  const issueDateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  const rows: InvoiceRow[] = payload.rows.map((r) => ({
    id: uid(),
    description: r.description,
    quantity: r.quantity,
    unit: r.unit ?? "",
    unitPrice: r.unitPrice,
    amount: r.amount,
  }))
  return {
    issueDate: issueDateStr,
    billTo: payload.billTo,
    billToAddress: payload.billToAddress,
    subject: payload.subject,
    bank: { ...DEFAULT_BANK },
    rows,
    note: payload.note,
    companyName: payload.companyName,
    companyAddress: payload.companyAddress,
    sealImageDataUrl: payload.sealImageDataUrl,
  }
}
