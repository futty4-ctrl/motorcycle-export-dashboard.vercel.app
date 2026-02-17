-- 実際の修理費・売却額・利益（予想 vs 実績の比較用）
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS actual_repair_cost NUMERIC(12, 0),
  ADD COLUMN IF NOT EXISTS actual_sale_price NUMERIC(12, 0),
  ADD COLUMN IF NOT EXISTS actual_profit NUMERIC(12, 0);

COMMENT ON COLUMN public.evaluations.actual_repair_cost IS '実際にかかった修理費（円）';
COMMENT ON COLUMN public.evaluations.actual_sale_price IS '実際の売却価格（円）';
COMMENT ON COLUMN public.evaluations.actual_profit IS '実際の利益（円）= 売却額 - 諸経費';
