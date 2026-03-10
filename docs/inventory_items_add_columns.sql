-- inventory_items に不足カラムを追加（テーブルは既に存在する前提）
-- Supabase ダッシュボードの SQL Editor で、このファイルの内容をそのまま実行してください
-- ※ CREATE TABLE は含みません。ALTER TABLE のみです。

ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS model_name TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS model_type TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS chassis_number TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 0) DEFAULT 0;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS condition_memo TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT '未処理';
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS seller_age TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS seller_address TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS seller_occupation TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS id_verification_method TEXT;
