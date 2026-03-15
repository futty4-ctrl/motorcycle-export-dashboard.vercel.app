export type Condition = "A" | "B" | "C" | "D"
export type Source =
  | "ヤフオク"
  | "BDS"
  | "カチオク"
  | "JBA"
  | "手動"
export type Trend = "up" | "down" | "flat"

// vehicles テーブル（既存スキーマに合わせる）
export interface Vehicle {
  id: string
  status: "in_stock" | "listed" | "sold" | "exported"
  bds_rating: string | null
  chassis_number: string | null
  drive_link: string | null
  // 右側に見えてないカラムがあれば後で追加
  created_at?: string
  updated_at?: string
}

// assess_history（新規作成したテーブル）
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

// market_prices（新規作成したテーブル）
export interface MarketPrice {
  id: string
  maker: string
  model: string
  year: string | null
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
