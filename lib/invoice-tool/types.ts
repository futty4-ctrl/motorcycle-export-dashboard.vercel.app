/** 請求書明細1行 */
export type InvoiceRow = {
  id: string
  description: string
  quantity: string | number
  /** 単位（個、式、時間、日など） */
  unit: string
  unitPrice: number
  amount: number
}

/** 振込先 */
export type InvoiceBank = {
  name: string
  branch: string
  branchCode: string
  accountType: string
  accountNumber: string
  accountName: string
}

/** 請求書の状態（編集用） */
export type InvoiceState = {
  issueDate: string
  billTo: string
  billToAddress: string
  subject: string
  bank: InvoiceBank
  rows: InvoiceRow[]
  note: string
  companyName: string
  companyAddress: string
  sealImageDataUrl: string
}
