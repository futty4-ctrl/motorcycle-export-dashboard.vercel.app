-- market_prices に実務カラムを追加（2026-03-26）
-- 利益計算・仕入れ判断に直結する6カラム

ALTER TABLE public.market_prices
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 0) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_days_to_sell NUMERIC(5, 1),
  ADD COLUMN IF NOT EXISTS cc INTEGER,
  ADD COLUMN IF NOT EXISTS season TEXT CHECK (season IN ('通年', '春夏高', '冬高', NULL)),
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT '低' CHECK (risk_level IN ('低', '中', '高')),
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;

COMMENT ON COLUMN public.market_prices.shipping_cost IS '送料（円）。大阪BDS直引き=0、関東=15000〜、九州=10000〜';
COMMENT ON COLUMN public.market_prices.avg_days_to_sell IS '平均売却日数。回転率の指標';
COMMENT ON COLUMN public.market_prices.cc IS '排気量（cc）。model_codesとの紐付け用';
COMMENT ON COLUMN public.market_prices.season IS '季節性（通年/春夏高/冬高）';
COMMENT ON COLUMN public.market_prices.risk_level IS 'リスク度（低/中/高）。不動車率・トラブル頻度';
COMMENT ON COLUMN public.market_prices.last_scanned_at IS '最終スキャン日時。データ鮮度管理';
