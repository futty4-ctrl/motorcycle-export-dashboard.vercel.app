// types/auction-history.ts

export type RecordType = "evaluation" | "history"
export type ResultStatus = "sold" | "unsold" | "unknown"
export type AuctionTypeKind = "蚤の市" | "定例"
export type BidResult = "won" | "lost" | "skipped"

export type AuctionSource = "BDS" | "JBA" | "OMC" | "USS" | "その他"

export interface AuctionHistoryRecord {
  id: string
  created_at: string
  extracted_at: string | null
  source: AuctionSource | null

  record_type: RecordType

  bds_lot_number: string | null
  model_name: string | null
  chassis_number: string | null
  engine_model: string | null

  mileage_km: number | null
  displacement_cc: number | null
  first_registration: string | null
  inspection: string | null
  parts_included: string | null

  start_price: number | null
  reserve_price: number | null
  sold_price: number | null
  result_status: ResultStatus | null

  region: string | null
  auction_type: AuctionTypeKind | null
  auction_date: string | null

  market_sold_count: number | null
  market_min_price: number | null
  market_max_price: number | null

  photo_urls: string[]
  source_url: string | null

  notes: string
  my_bid_price: number | null
  bid_result: BidResult | null
}

export type CcRange = "all" | "small" | "mid" | "large"

export interface AuctionHistoryFilter {
  search?: string
  recordType?: RecordType | "all"
  resultStatus?: ResultStatus | "all"
  auctionTypeKind?: AuctionTypeKind | "all"
  region?: string | "all"
  ccRange?: CcRange
  source?: AuctionSource | "all"
  dateFrom?: string
  dateTo?: string
}

export interface AuctionHistorySummary {
  total: number
  thisMonth: number
  soldRate: number
  avgSoldPrice: number
}
