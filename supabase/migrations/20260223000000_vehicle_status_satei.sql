-- ステータスに「査定中」を追加（コメントのみ。status は TEXT のため値の追加にマイグレーション不要）
COMMENT ON COLUMN public.vehicles.status IS 'ステータス（仕入中/査定中/落札/在庫あり/出品中/発送中/売却済）';
