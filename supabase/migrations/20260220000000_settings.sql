-- 利益計算のデフォルト値（陸送費・ヤフオク手数料等）を設定画面から変更する用
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL DEFAULT 'null'
);

COMMENT ON TABLE public.settings IS 'アプリ設定（陸送費・手数料・為替フォールバック等）。key-value で保持';
COMMENT ON COLUMN public.settings.key IS '設定キー（domestic_shipping_jpy, yahoo_fees_jpy 等）';
COMMENT ON COLUMN public.settings.value_json IS '値（数値または文字列を JSON で格納）';

-- 初期値
INSERT INTO public.settings (key, value_json) VALUES
  ('domestic_shipping_jpy', '30000'),
  ('yahoo_fees_jpy', '10000'),
  ('yahoo_shipping_jpy', '5000'),
  ('ebay_fees_usd', '50'),
  ('ebay_shipping_usd', '40'),
  ('fallback_usd_jpy', '150')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
