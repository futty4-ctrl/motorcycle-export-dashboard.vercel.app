-- =================================================================
-- パーツ単位在庫管理＋ヤフオク再出品履歴＋分解計画テンプレ＋全文検索
-- 2026-04-26
-- =================================================================

-- ========== 1. inventory_items 拡張 ==========
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS yahoo_auction_id TEXT,
  ADD COLUMN IF NOT EXISTS yahoo_auction_url TEXT,
  ADD COLUMN IF NOT EXISTS yahoo_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS yahoo_winning_bid INTEGER,
  ADD COLUMN IF NOT EXISTS listing_photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS part_name TEXT,
  ADD COLUMN IF NOT EXISTS part_category TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS source_vehicle_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ========== 2. 全文検索カラム ==========
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(management_code, '') || ' ' ||
      coalesce(part_name, '') || ' ' ||
      coalesce(part_category, '') || ' ' ||
      coalesce(model_name, '') || ' ' ||
      coalesce(maker, '') || ' ' ||
      coalesce(model_type, '') || ' ' ||
      coalesce(chassis_number, '') || ' ' ||
      coalesce(location, '') || ' ' ||
      coalesce(notes, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_inventory_search ON inventory_items USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_part_category ON inventory_items(part_category);
CREATE INDEX IF NOT EXISTS idx_inventory_yahoo_auction_id ON inventory_items(yahoo_auction_id);
CREATE INDEX IF NOT EXISTS idx_inventory_source_vehicle_id ON inventory_items(source_vehicle_id);

-- ========== 3. yahoo_listings_history（再出品履歴） ==========
CREATE TABLE IF NOT EXISTS yahoo_listings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  yahoo_auction_id TEXT,
  yahoo_auction_url TEXT,
  start_price INTEGER,
  final_price INTEGER,
  result TEXT CHECK (result IN ('sold', 'unsold', 'withdrawn', 'pending')),
  bid_count INTEGER,
  watch_count INTEGER,
  listing_round INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_listings_history_inventory ON yahoo_listings_history(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_listings_history_result ON yahoo_listings_history(result);
CREATE INDEX IF NOT EXISTS idx_listings_history_ended_at ON yahoo_listings_history(ended_at DESC);

-- ========== 4. parts_templates（車種別パーツマスター） ==========
CREATE TABLE IF NOT EXISTS parts_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_maker TEXT,
  vehicle_model TEXT NOT NULL,
  part_name TEXT NOT NULL,
  part_category TEXT,
  estimated_price INTEGER,
  pickup_rate NUMERIC,
  sample_size INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_model, part_name)
);

CREATE INDEX IF NOT EXISTS idx_parts_templates_vehicle ON parts_templates(vehicle_model);

-- ========== 5. 初期データ ==========
INSERT INTO parts_templates (vehicle_maker, vehicle_model, part_name, part_category, estimated_price)
VALUES
  ('ホンダ', 'CBR250R', '外装一式', '外装', 25000),
  ('ホンダ', 'CBR250R', 'フロントフォーク', '足回り', 8000),
  ('ホンダ', 'CBR250R', 'ホイール前', '足回り', 6000),
  ('ホンダ', 'CBR250R', 'ホイール後', '足回り', 6000),
  ('ホンダ', 'CBR250R', 'マフラー', 'エンジン', 7000),
  ('ホンダ', 'CBR250R', 'エンジン', 'エンジン', 35000),
  ('ホンダ', 'CBR250R', 'メーター', '電装', 5000),
  ('ホンダ', 'CBR250R', 'タンク', '外装', 8000),
  ('ホンダ', 'CBR250R', 'シート', '外装', 3000),
  ('ホンダ', 'CBR250R', 'スイングアーム', '足回り', 5000),
  ('ヤマハ', 'シグナスX', '外装一式', '外装', 12000),
  ('ヤマハ', 'シグナスX', 'エンジン', 'エンジン', 25000),
  ('ヤマハ', 'シグナスX', 'マフラー', 'エンジン', 5000),
  ('ヤマハ', 'シグナスX', 'ホイール前', '足回り', 4000),
  ('ヤマハ', 'シグナスX', 'ホイール後', '足回り', 4000),
  ('ヤマハ', 'シグナスX', 'メーター', '電装', 3000),
  ('ヤマハ', 'シグナスX', 'シート', '外装', 2500),
  ('ヤマハ', 'アクシスZ', '外装一式', '外装', 8000),
  ('ヤマハ', 'アクシスZ', 'エンジン', 'エンジン', 18000),
  ('ヤマハ', 'アクシスZ', 'メーター', '電装', 2500),
  ('ヤマハ', 'アクシスZ', 'ホイール前', '足回り', 3000),
  ('ヤマハ', 'アクシスZ', 'ホイール後', '足回り', 3000)
ON CONFLICT (vehicle_model, part_name) DO NOTHING;

COMMENT ON COLUMN inventory_items.search_vector IS '全文検索用ベクトル';
COMMENT ON TABLE yahoo_listings_history IS 'ヤフオク再出品履歴';
COMMENT ON TABLE parts_templates IS '車種別パーツテンプレ';
