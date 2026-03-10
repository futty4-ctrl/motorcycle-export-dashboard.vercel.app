-- inventory_items に RLS を有効化（サービスロールのみアクセス可）
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
