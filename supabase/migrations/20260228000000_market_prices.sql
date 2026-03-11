-- 車種別 相場データ（BDS・ヤフオク 手入力用）
CREATE TABLE IF NOT EXISTS public.market_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  bds_avg_jpy NUMERIC(12, 0),
  yahoo_avg_jpy NUMERIC(12, 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(model_name)
);

COMMENT ON TABLE public.market_prices IS '車種別 相場（BDS・ヤフオク 手入力）';
COMMENT ON COLUMN public.market_prices.model_name IS '車種・型式（例: モンキー Z50J）';
COMMENT ON COLUMN public.market_prices.bds_avg_jpy IS 'BDS 平均落札額（円）';
COMMENT ON COLUMN public.market_prices.yahoo_avg_jpy IS 'ヤフオク 平均落札額（円）';

CREATE INDEX IF NOT EXISTS idx_market_prices_model_name ON public.market_prices(model_name);

ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
