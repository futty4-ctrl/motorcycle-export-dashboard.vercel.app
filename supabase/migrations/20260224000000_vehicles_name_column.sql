-- 車種名（BDS解析・ブックマークレットで更新）
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN public.vehicles.name IS '車種名（表示用。BDS解析・AIで更新）';
