-- BDS 個票査定の保存用テーブル（/api/assess/save）
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bike_name TEXT,
  chassis_number TEXT,
  year TEXT,
  mileage TEXT,
  color TEXT,
  displacement TEXT,
  auction_price INTEGER,
  engine_status TEXT,
  damage_summary TEXT,
  total_cost_min INTEGER,
  total_cost_max INTEGER,
  sell_price_min INTEGER,
  sell_price_max INTEGER,
  profit_min INTEGER,
  profit_max INTEGER,
  verdict TEXT CHECK (verdict IN ('GO', 'NG', 'CAUTION')),
  verdict_reason TEXT,
  bid_limit INTEGER,
  platform TEXT DEFAULT 'BDS',
  assessed_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.assessments IS 'BDS個票査定結果（Claude AI）';
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
