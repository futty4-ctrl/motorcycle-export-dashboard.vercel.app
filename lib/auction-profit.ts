// lib/auction-profit.ts
// オークション履歴レコードから「利益予測」を算出する。
// ロジックは components/bds-border-content.tsx に準拠（YAHOO_FEE / BDS手数料 / 送料テーブル）。

const YAHOO_FEE = 2680 // 落札手数料1980 + 広告費700

const SHIPPING: Record<string, Record<string, number>> = {
  大阪: { "～125cc": 0, "126～750cc": 0, "751～1200cc": 0, "1201～1500cc": 0, "1501cc以上": 0 },
  関東: {
    "～125cc": 12430,
    "126～750cc": 12980,
    "751～1200cc": 13640,
    "1201～1500cc": 14300,
    "1501cc以上": 14850,
  },
  九州: {
    "～125cc": 14300,
    "126～750cc": 15070,
    "751～1200cc": 15730,
    "1201～1500cc": 16500,
    "1501cc以上": 17160,
  },
}

const BDS_FEES_A = [
  { max: 50000, fee: 3205 },
  { max: 100000, fee: 4389 },
  { max: 200000, fee: 5792 },
  { max: 300000, fee: 6327 },
  { max: 400000, fee: 7081 },
  { max: 500000, fee: 7709 },
  { max: 600000, fee: 8464 },
  { max: Infinity, fee: 9113 },
]

function getBDSFee(bidPrice: number): number {
  for (const b of BDS_FEES_A) if (bidPrice < b.max) return b.fee
  return BDS_FEES_A[BDS_FEES_A.length - 1].fee
}

function ccRange(cc: number | null): string {
  if (!cc) return "126～750cc"
  if (cc <= 125) return "～125cc"
  if (cc <= 750) return "126～750cc"
  if (cc <= 1200) return "751～1200cc"
  if (cc <= 1500) return "1201～1500cc"
  return "1501cc以上"
}

function venueFromRegion(region: string | null): "大阪" | "関東" | "九州" {
  if (!region) return "関東"
  if (/大阪|堺/.test(region)) return "大阪"
  if (/九州|福岡|熊本|鹿児島|長崎|佐賀|大分|宮崎/.test(region)) return "九州"
  return "関東"
}

export interface ProfitInputs {
  sold_price: number | null
  market_min_price: number | null
  market_max_price: number | null
  displacement_cc: number | null
  region: string | null
}

// 想定売価 = 相場の中央値（min/max の平均）
export function estimatedSalePrice(r: ProfitInputs): number | null {
  const { market_min_price, market_max_price } = r
  if (market_min_price && market_max_price) {
    return Math.round((market_min_price + market_max_price) / 2)
  }
  return market_max_price ?? market_min_price ?? null
}

// 利益予測 = 想定売価 - 送料 - BDS手数料(落札価格基準) - YAHOO_FEE - 落札価格
export function estimatedProfit(r: ProfitInputs): number | null {
  const yahoo = estimatedSalePrice(r)
  if (!yahoo || !r.sold_price) return null
  const shipping = SHIPPING[venueFromRegion(r.region)][ccRange(r.displacement_cc)]
  const bdsFee = getBDSFee(r.sold_price)
  return yahoo - shipping - bdsFee - YAHOO_FEE - r.sold_price
}

// 仕入れ候補判定（15万円以下＆予測利益3万円以上）
export function isBuyCandidate(r: ProfitInputs): boolean {
  if (!r.sold_price || r.sold_price > 150000) return false
  const p = estimatedProfit(r)
  return p !== null && p >= 30000
}
