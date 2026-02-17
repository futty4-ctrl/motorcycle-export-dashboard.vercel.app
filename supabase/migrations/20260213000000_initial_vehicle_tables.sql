-- =============================================
-- 車両管理テーブル（vehicle_id でリレーション・カスケード削除）
-- =============================================

-- 1. vehicles: 基本情報（ID, ステータス, BDS評価, 車体番号, Driveリンク）
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT '仕入中',
  bds_rating TEXT,
  chassis_number TEXT,
  drive_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vehicles IS '車両基本情報';
COMMENT ON COLUMN public.vehicles.status IS 'ステータス（仕入中/在庫あり/出品中/発送中/売却済）';
COMMENT ON COLUMN public.vehicles.bds_rating IS 'BDS評価';
COMMENT ON COLUMN public.vehicles.chassis_number IS '車体番号';
COMMENT ON COLUMN public.vehicles.drive_link IS 'Google Drive フォルダリンク';

-- 2. evaluations: AI査定結果（修理費予測, ネガティブ項目）
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  repair_cost_estimate NUMERIC(12, 0),
  negative_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.evaluations IS 'AI査定結果';
COMMENT ON COLUMN public.evaluations.repair_cost_estimate IS '修理費予測（円）';
COMMENT ON COLUMN public.evaluations.negative_items IS 'ネガティブ項目（文字列配列）';

CREATE INDEX IF NOT EXISTS idx_evaluations_vehicle_id ON public.evaluations(vehicle_id);

-- 3. scenarios: 利益計算結果（ヤフオク車体販売 vs eBayパーツ販売）
CREATE TABLE IF NOT EXISTS public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  scenario_type TEXT NOT NULL,
  profit NUMERIC(12, 0),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.scenarios IS '利益計算シナリオ';
COMMENT ON COLUMN public.scenarios.scenario_type IS 'シナリオ種別（yahoo_body / ebay_parts 等）';
COMMENT ON COLUMN public.scenarios.profit IS '予想利益（円）';
COMMENT ON COLUMN public.scenarios.details IS 'シナリオ詳細（単価・数量等）';

CREATE INDEX IF NOT EXISTS idx_scenarios_vehicle_id ON public.scenarios(vehicle_id);

-- 4. parts: 解体後のパーツリストと在庫場所
CREATE TABLE IF NOT EXISTS public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  storage_location TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.parts IS '解体後のパーツリスト';
COMMENT ON COLUMN public.parts.part_name IS 'パーツ名';
COMMENT ON COLUMN public.parts.storage_location IS '在庫場所';
COMMENT ON COLUMN public.parts.quantity IS '数量';

CREATE INDEX IF NOT EXISTS idx_parts_vehicle_id ON public.parts(vehicle_id);

-- updated_at 自動更新（任意）
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vehicles_updated_at ON public.vehicles;
CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS evaluations_updated_at ON public.evaluations;
CREATE TRIGGER evaluations_updated_at
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS scenarios_updated_at ON public.scenarios;
CREATE TRIGGER scenarios_updated_at
  BEFORE UPDATE ON public.scenarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS parts_updated_at ON public.parts;
CREATE TRIGGER parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
