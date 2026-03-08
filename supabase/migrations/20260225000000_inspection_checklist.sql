-- =============================================
-- 現物確認チェックリスト（Phase 1）
-- =============================================

-- 1. inspection_checklist_items: マスタ（確認項目）
CREATE TABLE IF NOT EXISTS public.inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.inspection_checklist_items IS '現物確認チェック項目マスタ';
COMMENT ON COLUMN public.inspection_checklist_items.category IS 'カテゴリ（engine/drive/documents/rust/electrical）';
COMMENT ON COLUMN public.inspection_checklist_items.label IS '表示ラベル';
COMMENT ON COLUMN public.inspection_checklist_items.sort_order IS '表示順';
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_checklist_items_category_label ON public.inspection_checklist_items(category, label);

-- 2. vehicle_inspection_results: 各車両のチェック結果
CREATE TABLE IF NOT EXISTS public.vehicle_inspection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inspection_checklist_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'needs_check',
  note TEXT,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, item_id)
);

COMMENT ON TABLE public.vehicle_inspection_results IS '車両ごとの現物確認チェック結果';
COMMENT ON COLUMN public.vehicle_inspection_results.status IS '状態（ok/ng/needs_check）';
COMMENT ON COLUMN public.vehicle_inspection_results.note IS 'メモ';

CREATE INDEX IF NOT EXISTS idx_vehicle_inspection_results_vehicle_id ON public.vehicle_inspection_results(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspection_results_item_id ON public.vehicle_inspection_results(item_id);

-- updated_at 自動更新
DROP TRIGGER IF EXISTS vehicle_inspection_results_updated_at ON public.vehicle_inspection_results;
CREATE TRIGGER vehicle_inspection_results_updated_at
  BEFORE UPDATE ON public.vehicle_inspection_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. マスタデータ投入
INSERT INTO public.inspection_checklist_items (category, label, sort_order) VALUES
  ('engine', 'エンジン始動・アイドリング', 10),
  ('engine', 'クラッチ・変速', 20),
  ('drive', 'サスペンション', 30),
  ('drive', 'ブレーキ', 40),
  ('drive', 'タイヤ・ホイール', 50),
  ('documents', '車検・ナンバー', 60),
  ('documents', '書類（譲渡証明等）', 70),
  ('rust', '錆・腐食', 80),
  ('electrical', '電気系（ライト・バッテリー等）', 90)
ON CONFLICT (category, label) DO NOTHING;
