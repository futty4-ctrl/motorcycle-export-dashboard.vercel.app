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
  created_at: string
  updated_at: string
}

export type VehicleInsert = {
  id?: string
  status?: VehicleStatus
  bds_rating?: string | null
  chassis_number?: string | null
  drive_link?: string | null
  created_at?: string
  updated_at?: string
}

export type VehicleUpdate = Partial<Omit<VehicleInsert, "id">>

// ========== evaluations: AI査定結果 ==========
export type EvaluationRow = {
  id: string
  vehicle_id: string
  repair_cost_estimate: number | null
  negative_items: string[]
  created_at: string
  updated_at: string
}

export type EvaluationInsert = {
  id?: string
  vehicle_id: string
  repair_cost_estimate?: number | null
  negative_items?: string[]
  created_at?: string
  updated_at?: string
}

export type EvaluationUpdate = Partial<Omit<EvaluationInsert, "id" | "vehicle_id">>

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
    }
  }
}
