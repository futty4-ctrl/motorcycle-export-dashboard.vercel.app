-- =============================================
-- inventory_items の RLS ポリシー（ブラウザクライアント用）
-- Supabase ダッシュボードの SQL Editor で実行してください
-- =============================================
-- ブラウザから @supabase/supabase-js（anon キー）で直接読み書きする場合、
-- 以下のポリシーが必要です。内部利用・単一テナントを想定しています。

-- 全件取得を許可
CREATE POLICY "inventory_items_select_all"
  ON public.inventory_items
  FOR SELECT
  USING (true);

-- 挿入を許可
CREATE POLICY "inventory_items_insert_all"
  ON public.inventory_items
  FOR INSERT
  WITH CHECK (true);

-- 更新を許可
CREATE POLICY "inventory_items_update_all"
  ON public.inventory_items
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
