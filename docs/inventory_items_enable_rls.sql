-- inventory_items に RLS を有効化し、ポリシーを追加
-- Supabase ダッシュボードの SQL Editor で実行してください
-- ※ これによりセキュリティ警告が解消されます

-- 1. RLS を有効化
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- 2. ポリシーを追加（anon キーで読み書き可能にする）
CREATE POLICY "inventory_items_select_all"
  ON public.inventory_items
  FOR SELECT
  USING (true);

CREATE POLICY "inventory_items_insert_all"
  ON public.inventory_items
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "inventory_items_update_all"
  ON public.inventory_items
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
