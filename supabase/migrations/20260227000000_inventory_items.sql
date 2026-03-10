-- =============================================
-- 在庫＆古物台帳 統合テーブル
-- =============================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_code TEXT UNIQUE NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT '車体' CHECK (category IN ('車体', 'パーツ')),
  maker TEXT,
  model_name TEXT,
  model_type TEXT,
  chassis_number TEXT,
  purchase_price NUMERIC(12, 0) DEFAULT 0,
  condition_memo TEXT,
  status TEXT NOT NULL DEFAULT '未処理' CHECK (status IN ('未処理', '出品準備中', 'ヤフオク出品中', '売約済み')),
  seller_name TEXT,
  seller_age TEXT,
  seller_address TEXT,
  seller_occupation TEXT,
  id_verification_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.inventory_items IS '在庫＆古物台帳（警察対応用受入情報含む）';
COMMENT ON COLUMN public.inventory_items.management_code IS '管理番号（INV-日付-4桁英数字）';
COMMENT ON COLUMN public.inventory_items.purchase_date IS '仕入日';
COMMENT ON COLUMN public.inventory_items.category IS 'カテゴリ（車体/パーツ）';
COMMENT ON COLUMN public.inventory_items.maker IS 'メーカー';
COMMENT ON COLUMN public.inventory_items.model_name IS '車名';
COMMENT ON COLUMN public.inventory_items.model_type IS '型式';
COMMENT ON COLUMN public.inventory_items.chassis_number IS '車台番号';
COMMENT ON COLUMN public.inventory_items.purchase_price IS '仕入価格（円）';
COMMENT ON COLUMN public.inventory_items.condition_memo IS '状態メモ';
COMMENT ON COLUMN public.inventory_items.status IS 'ステータス';
COMMENT ON COLUMN public.inventory_items.seller_name IS '相手の氏名（古物台帳）';
COMMENT ON COLUMN public.inventory_items.seller_age IS '相手の年齢（古物台帳）';
COMMENT ON COLUMN public.inventory_items.seller_address IS '相手の住所（古物台帳）';
COMMENT ON COLUMN public.inventory_items.seller_occupation IS '相手の職業（古物台帳）';
COMMENT ON COLUMN public.inventory_items.id_verification_method IS '本人確認方法（古物台帳）';

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_management_code ON public.inventory_items(management_code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON public.inventory_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items(status);

DROP TRIGGER IF EXISTS inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
