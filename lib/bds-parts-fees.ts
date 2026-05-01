/**
 * BDSパーツオークションの落札料テーブル
 * 落札金額帯ごとに固定額（出品料・成約料は売り手側のため、買い手は落札料のみ）
 */

const BDS_PARTS_HAMMER_FEE: Array<{ max: number; fee: number }> = [
  { max: 30_000, fee: 2_200 },
  { max: 50_000, fee: 3_200 },
  { max: 100_000, fee: 4_300 },
  { max: Infinity, fee: 5_700 },
]

export const YAHOO_FEE_RATE = 0.1199
export const PARTS_TARGET_PROFIT = 2_000

export function getBdsPartsHammerFee(wonPrice: number): number {
  for (const tier of BDS_PARTS_HAMMER_FEE) {
    if (wonPrice < tier.max) return tier.fee
  }
  return BDS_PARTS_HAMMER_FEE[BDS_PARTS_HAMMER_FEE.length - 1].fee
}

/**
 * 入札上限を算出
 * 入札上限 = 想定売価 × (1 - ヤフオク手数料率) - BDS落札料 - 目標利益
 *
 * BDS落札料は仮に「想定売価と同額で落札した場合」のtierを使う簡易計算。
 * （正確には入札額自身の関数だが、tierが粗いので近似で十分）
 */
export type BidLimitResult = {
  bidLimit: number
  yahooNet: number
  bdsHammerFee: number
  targetProfit: number
  warning: string | null
}

export function calcPartsBidLimit(estimatedSalePrice: number): BidLimitResult {
  const yahooNet = Math.floor(estimatedSalePrice * (1 - YAHOO_FEE_RATE))
  const bdsHammerFee = getBdsPartsHammerFee(estimatedSalePrice)
  const targetProfit = PARTS_TARGET_PROFIT
  const bidLimit = yahooNet - bdsHammerFee - targetProfit

  let warning: string | null = null
  if (bidLimit <= 0) {
    warning = "想定売価が低すぎて利益が出ません"
  } else if (bidLimit < 1_000) {
    warning = "入札上限が¥1,000未満。仕入れ妙味薄い"
  }

  return { bidLimit, yahooNet, bdsHammerFee, targetProfit, warning }
}
