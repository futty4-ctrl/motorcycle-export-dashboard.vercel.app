export type Condition = "A" | "B" | "C" | "D"
export type Source =
  | "ヤフオク"
  | "BDS"
  | "カチオク"
  | "JBA"
  | "手動"
export type Trend = "up" | "down" | "flat"

// ── 在庫 ──────────────────────────────────────────────────────
export interface Vehicle {
  id: string
  maker: string
  model: string
  year: string
  condition: Condition
  purchase_price: number
  target_price: number
  status: "in_stock" | "listed" | "sold" | "exported"
  location: string
  memo: string | null
  images: string[]
  created_at: string
  updated_at: string
}

// ── 査定履歴 ─────────────────────────────────────────────────
export interface AssessHistory {
  id: string
  manufacturer: string
  vehicle_name: string
  model_type: string | null
  condition: Condition
  yahoo_avg_bid: number
  bds_bid_limit: number
  created_at: string
}

// ── 市場価格 ─────────────────────────────────────────────────
export interface MarketPrice {
  id: string
  maker: string
  model: string
  year: string
  condition: Condition
  source: Source
  avg_price: number
  min_price: number
  max_price: number
  sample_count: number
  trend: Trend
  trend_pct: number
  memo: string | null
  updated_at: string
}
