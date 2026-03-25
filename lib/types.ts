export type Condition = "A" | "B" | "C" | "D"
export type Source =
  | "ヤフオク"
  | "BDS"
  | "カチオク"
  | "JBA"
  | "手動"
export type Trend = "up" | "down" | "flat"

// vehicles テーブル（DBスキーマに合わせる）
export interface Vehicle {
  id: string
  status: "仕入中" | "査定中" | "落札" | "在庫あり" | "出品中" | "売却済" | "発送中"
  bds_rating: string | null
  chassis_number: string | null
  drive_link: string | null
  lot_number: string | null
  source_url: string | null
  image_url: string | null
  name: string | null
  year: number | null
  mileage: string | null
  onsite_notes: string | null
  seller_info: string | null
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
export type Season = "通年" | "春夏高" | "冬高"
export type RiskLevel = "低" | "中" | "高"

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
  shipping_cost: number
  avg_days_to_sell: number | null
  cc: number | null
  season: Season | null
  risk_level: RiskLevel
  last_scanned_at: string | null
  updated_at: string
}
