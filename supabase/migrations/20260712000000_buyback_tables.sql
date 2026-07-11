-- 買取査定Bot: 案件・写真・イベント
-- 方針：個人情報（氏名/住所/電話/免許証）はアプリに保存しない（ふっちーの携帯で扱う）。
-- よって buyback_kyc テーブル・PII列は作らない。記帳は手動運用。

CREATE SEQUENCE IF NOT EXISTS public.buyback_case_seq START 1;

CREATE TABLE IF NOT EXISTS public.buyback_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_no text UNIQUE NOT NULL DEFAULT ('B' || lpad(nextval('public.buyback_case_seq')::text, 3, '0')),
  line_user_id text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'hearing',
  maker text,
  model text,
  model_year text,
  mileage_km integer,
  engine_status text,        -- かかる / かからない / 不明
  docs_status text,          -- あり / なし / 不明
  customer_note text,
  raw_hearing_text text,     -- 抽出失敗時の原文保険
  photo_count integer NOT NULL DEFAULT 0,
  quote_amount integer,
  quoted_at timestamptz,
  quote_expires_at timestamptz,
  final_price integer,
  pickup_date date,
  pickup_slot text,
  source text DEFAULT 'line',  -- line / jimoty / gbp / referral / other
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyback_cases_line_user ON public.buyback_cases(line_user_id);
CREATE INDEX IF NOT EXISTS idx_buyback_cases_status ON public.buyback_cases(status);

CREATE TABLE IF NOT EXISTS public.buyback_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.buyback_cases(id) ON DELETE CASCADE,
  storage_path text,
  line_message_id text UNIQUE,   -- 再配送 dedupe の要
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyback_photos_case ON public.buyback_photos(case_id);

CREATE TABLE IF NOT EXISTS public.buyback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.buyback_cases(id) ON DELETE SET NULL,
  type text NOT NULL,             -- webhook_received / quote_sent / push_sent / lw_command ...
  external_event_id text UNIQUE,  -- LINE/LW のイベントID（NULL可・存在時のみ dedupe）
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyback_events_case ON public.buyback_events(case_id);

-- RLS: サービスロールのみアクセス（クライアント直アクセス禁止・既存方針と同じ）
ALTER TABLE public.buyback_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyback_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyback_events ENABLE ROW LEVEL SECURITY;
