-- auction_history の bds_lot_number 単独UNIQUE制約を外し、
-- (bds_lot_number, auction_date, region) の複合UNIQUE制約に変更
-- 目的: 同じlot#でも日付・会場が違えば別エントリとして蓄積可能に

-- 1. 単独UNIQUE制約・インデックスを削除（存在する場合のみ）
DO $$
DECLARE
  idx_name text;
BEGIN
  -- UNIQUE制約名は環境により変動するので検出して削除
  FOR idx_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'auction_history'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE 'ALTER TABLE auction_history DROP CONSTRAINT IF EXISTS ' || quote_ident(idx_name);
  END LOOP;

  -- bds_lot_number 単独UNIQUE indexがあれば削除
  FOR idx_name IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'auction_history'
      AND indexname LIKE '%bds_lot_number%'
      AND indexname NOT LIKE '%composite%'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_name);
  END LOOP;
END $$;

-- 2. 複合UNIQUE index を作成（region がNULLの場合も考慮）
CREATE UNIQUE INDEX IF NOT EXISTS auction_history_composite_unique_idx
  ON auction_history (
    bds_lot_number,
    auction_date,
    COALESCE(region, '')
  )
  WHERE bds_lot_number IS NOT NULL AND auction_date IS NOT NULL;

-- 3. 検索用の通常index（既存データ活用の高速化）
CREATE INDEX IF NOT EXISTS auction_history_lot_number_idx
  ON auction_history (bds_lot_number);
CREATE INDEX IF NOT EXISTS auction_history_auction_date_idx
  ON auction_history (auction_date);
CREATE INDEX IF NOT EXISTS auction_history_model_name_idx
  ON auction_history (model_name);

-- 4. 確認用コメント
COMMENT ON INDEX auction_history_composite_unique_idx IS
  '同じlot#でも日付・会場が違えば別エントリとして記録する複合UNIQUE制約';
