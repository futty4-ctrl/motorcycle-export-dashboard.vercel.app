-- =================================================================
-- パーツ相場リサーチログ（P1）
-- 2026-04-27
-- =================================================================

CREATE TABLE IF NOT EXISTS parts_research_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bds_url TEXT,
  bds_lot_no TEXT,
  maker TEXT NOT NULL,
  product_name TEXT NOT NULL,
  search_keyword TEXT NOT NULL,
  bds_start_price INT,
  bds_won_price INT,
  yahoo_median_price INT,
  yahoo_listing_count INT,
  decision TEXT CHECK (decision IN ('go', 'hold', 'pass') OR decision IS NULL),
  bid_limit INT,
  notes TEXT,
  searched_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_parts_research_searched_at
  ON parts_research_log(searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_parts_research_keyword
  ON parts_research_log(search_keyword);

ALTER TABLE parts_research_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own research log" ON parts_research_log;
CREATE POLICY "Users can view own research log"
  ON parts_research_log FOR SELECT
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can insert own research log" ON parts_research_log;
CREATE POLICY "Users can insert own research log"
  ON parts_research_log FOR INSERT
  WITH CHECK (auth.uid() = created_by);

COMMENT ON TABLE parts_research_log IS 'BDSパーツ仕入れ判断のためのヤフオク相場リサーチ履歴（P1）';
