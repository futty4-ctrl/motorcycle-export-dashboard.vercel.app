-- ヤフオク出品一覧のキャッシュ（15〜30分更新用）
CREATE TABLE IF NOT EXISTS public.yahoo_auctions_cache (
  cache_key TEXT PRIMARY KEY DEFAULT 'default',
  seller_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.yahoo_auctions_cache IS 'ヤフオク出品者ページのスクレイピング結果キャッシュ';
COMMENT ON COLUMN public.yahoo_auctions_cache.data IS '出品中アイテム一覧（title, price, bidCount, timeLeft, imageUrl, itemUrl）';
COMMENT ON COLUMN public.yahoo_auctions_cache.fetched_at IS '取得日時（この時刻から15〜30分は再取得しない）';
