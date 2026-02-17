-- ブックマークレット用: 出品番号・元ページURLを保存
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

COMMENT ON COLUMN public.vehicles.lot_number IS '出品番号（オークション等）';
COMMENT ON COLUMN public.vehicles.source_url IS '元ページURL（BDS・オークション等）';
