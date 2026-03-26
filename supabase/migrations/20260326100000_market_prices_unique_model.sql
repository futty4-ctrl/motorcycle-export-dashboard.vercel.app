-- modelカラムにユニーク制約を追加（maker+modelの組み合わせで重複防止）
-- 既存の重複データを削除してからユニーク制約を追加

-- 重複を削除（最新のupdated_atのみ残す）
DELETE FROM public.market_prices a
USING public.market_prices b
WHERE a.id < b.id
  AND a.maker = b.maker
  AND a.model = b.model;

-- ユニークインデックスを追加
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_prices_maker_model
  ON public.market_prices(maker, model);
