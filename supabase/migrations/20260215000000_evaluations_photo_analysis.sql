-- オークション写真一括解析結果を保存するカラム
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS photo_analysis JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.evaluations.photo_analysis IS 'Drive写真一括解析結果（外装の傷・エンジン腐食・消耗品・カスタムパーツ・高値eBayパーツ等）';
