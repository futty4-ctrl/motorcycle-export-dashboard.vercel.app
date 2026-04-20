-- 単独UNIQUE制約 uq_auction_history_lot を削除
-- 複合UNIQUE (bds_lot_number, auction_date, region, source) だけに統一するため

DROP INDEX IF EXISTS uq_auction_history_lot;

-- 念のため：同様のlot#単独UNIQUE制約が他の名前で存在したら全削除
DO $$
DECLARE
  idx_name text;
BEGIN
  FOR idx_name IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'auction_history'
      AND indexname NOT IN (
        'auction_history_pkey',
        'auction_history_composite_unique_idx',
        'auction_history_lot_number_idx',
        'auction_history_auction_date_idx',
        'auction_history_model_name_idx',
        'auction_history_source_idx',
        'idx_auction_history_date',
        'idx_auction_history_model',
        'idx_auction_history_type',
        'idx_auction_history_result'
      )
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_name);
  END LOOP;
END $$;

COMMENT ON INDEX auction_history_composite_unique_idx IS
  '(lot#, 開催日, 会場, サイト) で一意。同じlot#でも別日なら別エントリ';
