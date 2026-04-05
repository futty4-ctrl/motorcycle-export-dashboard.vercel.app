/**
 * Supabase (PostgreSQL) テーブルに対応する TypeScript 型定義
 * マイグレーション: supabase/migrations/20260213000000_initial_vehicle_tables.sql
 */

/** 車両ステータス（落札＝オークション落札時。古物台帳への自動追加トリガー） */
export type VehicleStatus =
  | "仕入中"
  | "査定中"
  | "落札"
  | "在庫あり"
  | "出品中"
  | "発送中"
  | "売却済"

/** 利益シナリオ種別 */
export type ScenarioType = "yahoo_body" | "ebay_parts"

// ========== vehicles: 基本情報 ==========
export type VehicleRow = {
  id: string
  status: VehicleStatus
  bds_rating: string | null
  chassis_number: string | null
  drive_link: string | null
  onsite_notes: string | null
  seller_info: string | null
  created_at: string
  updated_at: string
}

export type VehicleInsert = {
  id?: string
  status?: VehicleStatus
  bds_rating?: string | null
  chassis_number?: string | null
  drive_link?: string | null
  onsite_notes?: string | null
  seller_info?: string | null
  created_at?: string
  updated_at?: string
}

export type VehicleUpdate = Partial<Omit<VehicleInsert, "id">>

// ========== evaluations: AI査定結果 + 入札判断 ==========
export type VehicleCategory = "4ミニ" | "ネイキッド" | "オフ車" | "その他"
export type ConditionRank = "A" | "B" | "C" | "D"
export type BidDecision = "GO" | "NO GO" | "見送り"

export type EvaluationRow = {
  id: string
  vehicle_id: string
  repair_cost_estimate: number | null
  negative_items: string[]
  created_at: string
  updated_at: string
  // 入札判断ロジック用（トリガーで自動算出されるカラム含む）
  vehicle_category: VehicleCategory | null
  condition_rank: ConditionRank | null
  estimated_sale_price: number | null
  transport_cost: number | null
  auction_fee_rate: number | null
  yahoo_fee_rate: number | null
  ad_cost: number | null
  target_profit: number | null
  bid_limit_best: number | null
  bid_limit_min: number | null
  bid_decision: BidDecision | null
  decision_reason: string | null
  sale_price_source: string | null
}

export type EvaluationInsert = {
  id?: string
  vehicle_id: string
  repair_cost_estimate?: number | null
  negative_items?: string[]
  created_at?: string
  updated_at?: string
  vehicle_category?: VehicleCategory | null
  condition_rank?: ConditionRank | null
  estimated_sale_price?: number | null
  transport_cost?: number | null
  auction_fee_rate?: number | null
  yahoo_fee_rate?: number | null
  ad_cost?: number | null
  target_profit?: number | null
  bid_limit_best?: number | null
  bid_limit_min?: number | null
  bid_decision?: BidDecision | null
  decision_reason?: string | null
  sale_price_source?: string | null
}

export type EvaluationUpdate = Partial<Omit<EvaluationInsert, "id" | "vehicle_id">>

// ========== inventory_items: 出品〜結果トラッキング用の追加型 ==========
// ※ 基本の InventoryItemRow は lib/inventory-supabase.ts を参照。
// ここでは仕入れロジックSQLで追加された実績カラム用の enum と update 型のみ定義。
export type AuctionSource = "BDS" | "JBA" | "OMC" | "ヤフオク" | "その他"
export type ListingEndDay = "月" | "火" | "水" | "木" | "金" | "土" | "日"

export type InventoryActualsUpdate = {
  photo_count?: number | null
  has_video?: boolean | null
  listing_ad_cost?: number | null
  listing_start_price?: number | null
  listing_end_day?: ListingEndDay | null
  listing_end_time?: string | null
  listing_duration_days?: number | null
  watch_count?: number | null
  bid_count?: number | null
  bidder_count?: number | null
  auction_source?: AuctionSource | null
  transport_cost_actual?: number | null
  bds_fee_actual?: number | null
  sold_price?: number | null
  sold_date?: string | null
}

// ========== scenarios: 利益計算結果 ==========
export type ScenarioRow = {
  id: string
  vehicle_id: string
  scenario_type: ScenarioType
  profit: number | null
  details: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ScenarioInsert = {
  id?: string
  vehicle_id: string
  scenario_type: ScenarioType
  profit?: number | null
  details?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export type ScenarioUpdate = Partial<Omit<ScenarioInsert, "id" | "vehicle_id">>

// ========== parts: 解体後のパーツリストと在庫場所 ==========
export type PartRow = {
  id: string
  vehicle_id: string
  part_name: string
  storage_location: string | null
  quantity: number
  created_at: string
  updated_at: string
}

export type PartInsert = {
  id?: string
  vehicle_id: string
  part_name: string
  storage_location?: string | null
  quantity?: number
  created_at?: string
  updated_at?: string
}

export type PartUpdate = Partial<Omit<PartInsert, "id" | "vehicle_id">>

// ========== bad_cases: AI見落とし事例（次回解析で重点チェック） ==========
export type BadCaseRow = {
  id: string
  evaluation_id: string
  vehicle_id: string
  ai_summary: Record<string, unknown>
  actual_findings: string
  focus_points: string[]
  created_at: string
}

export type BadCaseInsert = {
  id?: string
  evaluation_id: string
  vehicle_id: string
  ai_summary?: Record<string, unknown>
  actual_findings: string
  focus_points?: string[]
  created_at?: string
}

// ========== drive_uploads: Drive アップロード記録 ==========
export type DriveUploadRow = {
  id: string
  file_url: string
  file_name: string
  mime_type: string | null
  drive_folder_id: string | null
  drive_folder_url: string | null
  vehicle_id: string | null
  created_at: string
}

export type DriveUploadInsert = {
  id?: string
  file_url: string
  file_name: string
  mime_type?: string | null
  drive_folder_id?: string | null
  drive_folder_url?: string | null
  vehicle_id?: string | null
  created_at?: string
}

// ========== inspection_checklist_items: 現物確認項目マスタ ==========
export type InspectionChecklistItemRow = {
  id: string
  category: string
  label: string
  sort_order: number
  created_at: string
}

export type InspectionChecklistItemInsert = {
  id?: string
  category: string
  label: string
  sort_order?: number
  created_at?: string
}

// ========== vehicle_inspection_results: 各車両のチェック結果 ==========
export type InspectionResultStatus = "ok" | "ng" | "needs_check"

export type VehicleInspectionResultRow = {
  id: string
  vehicle_id: string
  item_id: string
  status: InspectionResultStatus
  note: string | null
  checked_at: string | null
  created_at: string
  updated_at: string
}

export type VehicleInspectionResultInsert = {
  id?: string
  vehicle_id: string
  item_id: string
  status?: InspectionResultStatus
  note?: string | null
  checked_at?: string | null
  created_at?: string
  updated_at?: string
}

export type VehicleInspectionResultUpdate = Partial<
  Omit<VehicleInspectionResultInsert, "id" | "vehicle_id" | "item_id">
>

// ========== Supabase Database 型（クライアントの型推論用） ==========
export type Database = {
  public: {
    Tables: {
      vehicles: {
        Row: VehicleRow
        Insert: VehicleInsert
        Update: VehicleUpdate
      }
      evaluations: {
        Row: EvaluationRow
        Insert: EvaluationInsert
        Update: EvaluationUpdate
      }
      scenarios: {
        Row: ScenarioRow
        Insert: ScenarioInsert
        Update: ScenarioUpdate
      }
      parts: {
        Row: PartRow
        Insert: PartInsert
        Update: PartUpdate
      }
      drive_uploads: {
        Row: DriveUploadRow
        Insert: DriveUploadInsert
        Update: Partial<DriveUploadInsert>
      }
      bad_cases: {
        Row: BadCaseRow
        Insert: BadCaseInsert
        Update: Partial<Omit<BadCaseInsert, "id" | "evaluation_id" | "vehicle_id">>
      }
      inspection_checklist_items: {
        Row: InspectionChecklistItemRow
        Insert: InspectionChecklistItemInsert
      }
      vehicle_inspection_results: {
        Row: VehicleInspectionResultRow
        Insert: VehicleInspectionResultInsert
        Update: VehicleInspectionResultUpdate
      }
    }
  }
}
