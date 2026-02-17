export type LineType = "fixed" | "unit" | "auto" | "adjustment"

export type QuoteLine = {
  id: string
  label: string
  type: LineType
  quantity: number
  unitPrice: number
  amount: number
  groupId: string
  /** auto 行の配分比率（均等の場合は 1:1:1 = 省略可） */
  autoRatio?: number
}

export type QuoteGroup = {
  id: string
  label: string
  order: number
}

export type RoundingUnit = 1 | 10 | 100 | 1000
export type RoundingMode = "floor" | "ceil" | "round"

export type QuoteState = {
  groups: QuoteGroup[]
  lines: QuoteLine[]
  /** 宛先（相手）の名前 */
  billToName: string
  /** 宛先（相手）の住所 */
  billToAddress: string
  /** 発行元（自社）の名前（右上に表示） */
  companyName: string
  /** 発行元（自社）の住所・電話 */
  companyAddress: string
  /** 印鑑画像の Data URL（右上に表示） */
  sealImageDataUrl: string
  /** 備考 */
  note: string
  /** 見積有効期限（例: 2026年3月17日） */
  validUntil: string
  targetTotalInclTax: number | null
  autoDistribution: "equal" | "ratio"
  roundingUnit: RoundingUnit
  roundingMode: RoundingMode
  taxRate: number
}

export const TAX_RATE = 0.1
