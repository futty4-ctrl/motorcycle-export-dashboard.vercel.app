-- inventory_items に DELETE ポリシーを追加
-- Supabase ダッシュボードの SQL Editor で実行してください

CREATE POLICY "inventory_items_delete_all"
  ON public.inventory_items
  FOR DELETE
  USING (true);
