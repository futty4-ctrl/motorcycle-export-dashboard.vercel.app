-- Row Level Security を有効化（anon キーからはアクセス不可、サービスロールは従来どおり全アクセス可能）
-- 本アプリは Server Actions でサービスロールのみ使用するため、RLS 有効化でクライアント直アクセスを遮断する

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bad_cases ENABLE ROW LEVEL SECURITY;

-- yahoo_auctions_cache は 1 行のみのキャッシュ用
ALTER TABLE public.yahoo_auctions_cache ENABLE ROW LEVEL SECURITY;

-- ポリシーを付けないため、anon キーでは SELECT/INSERT/UPDATE/DELETE いずれも不可。
-- サービスロールキーは RLS をバイパスするため、従来どおり全操作可能。
