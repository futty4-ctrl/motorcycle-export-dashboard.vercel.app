-- auction_history に仕入サイト（source）フィールドを追加
-- 目的: BDS/JBA/OMC/USS 等の別サイト対応。会場別・サイト別分析を可能に

ALTER TABLE auction_history
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'BDS';

-- 既存データはすべてBDSなのでデフォルト値で埋まる

-- 検索用index
CREATE INDEX IF NOT EXISTS auction_history_source_idx
  ON auction_history (source);

-- 複合UNIQUE制約を (bds_lot_number, auction_date, region, source) に更新
-- 既存のcomposite indexを削除して作り直す
DROP INDEX IF EXISTS auction_history_composite_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS auction_history_composite_unique_idx
  ON auction_history (
    bds_lot_number,
    auction_date,
    COALESCE(region, ''),
    COALESCE(source, 'BDS')
  )
  WHERE bds_lot_number IS NOT NULL AND auction_date IS NOT NULL;

COMMENT ON COLUMN auction_history.source IS '仕入サイト（BDS/JBA/OMC/USS等）';
COMMENT ON INDEX auction_history_composite_unique_idx IS
  '(lot#, 開催日, 会場, 仕入サイト) の複合UNIQUE。同じlot#でも別日/別会場/別サイトなら別エントリ';
