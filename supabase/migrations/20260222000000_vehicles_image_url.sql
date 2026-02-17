-- 車両サムネイル・詳細表示用の画像URL（BDS・オークション等の1枚目URL）
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.vehicles.image_url IS '表示用画像URL（サムネイル・詳細のメイン画像）';
