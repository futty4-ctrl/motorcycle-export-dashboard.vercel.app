/**
 * 入札上限の試算ロジック（DBトリガー calc_bid_limits() と同じ）
 * クライアント側でのリアルタイムプレビュー用
 */
export function previewBidLimits(params: {
  estimated_sale_price: number
  repair_cost_estimate: number
  transport_cost?: number
  auction_fee_rate?: number
  yahoo_fee_rate?: number
  ad_cost?: number
}): { bid_limit_best: number; bid_limit_min: number } {
  const yahooFeeRate = params.yahoo_fee_rate ?? 0.088
  const transport = params.transport_cost ?? 20000
  const ad = params.ad_cost ?? 700
  const feeDivisor = 1 + (params.auction_fee_rate ?? 0.1)
  const netSale = params.estimated_sale_price * (1 - yahooFeeRate)
  const fixed = transport + params.repair_cost_estimate + ad

  const best = Math.min(
    Math.max(Math.floor((netSale - fixed - 50000) / feeDivisor), 0),
    150000
  )
  const min = Math.min(
    Math.max(Math.floor((netSale - fixed - 20000) / feeDivisor), 0),
    150000
  )
  return { bid_limit_best: best, bid_limit_min: min }
}
