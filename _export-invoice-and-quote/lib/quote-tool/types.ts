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
  targetTotalInclTax: number | null
  autoDistribution: "equal" | "ratio"
  roundingUnit: RoundingUnit
  roundingMode: RoundingMode
  taxRate: number
}

export const TAX_RATE = 0.1
