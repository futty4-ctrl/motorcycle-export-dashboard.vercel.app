-- market_prices テーブルにリッチなカラムを追加
-- lib/types.MarketPrice に合わせる
ALTER TABLE public.market_prices
  ADD COLUMN IF NOT EXISTS maker TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS condition TEXT CHECK (condition IN ('A', 'B', 'C', 'D')),
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '手動' CHECK (source IN ('ヤフオク', 'BDS', 'カチオク', 'JBA', '手動')),
  ADD COLUMN IF NOT EXISTS avg_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sample_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT 'flat' CHECK (trend IN ('up', 'down', 'flat')),
  ADD COLUMN IF NOT EXISTS trend_pct NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS memo TEXT;

COMMENT ON TABLE public.market_prices IS '車種別市場価格マスター（メーカー・コンディション・トレンド付き）';
