-- Bad Case: AIが「綺麗」と判断したが実際は不良だった事例を保存し、次回解析で重点チェックに使う
CREATE TABLE IF NOT EXISTS public.bad_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  ai_summary JSONB DEFAULT '{}'::jsonb,
  actual_findings TEXT NOT NULL,
  focus_points JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bad_cases IS 'AIが見落とした事例（綺麗と言ったが実際は不良）。次回解析で focus_points を重点チェックする';
COMMENT ON COLUMN public.bad_cases.evaluation_id IS '対象の査定ID';
COMMENT ON COLUMN public.bad_cases.vehicle_id IS '車両ID（参照用）';
COMMENT ON COLUMN public.bad_cases.ai_summary IS '当時AIが出力した要約（評価・note等）';
COMMENT ON COLUMN public.bad_cases.actual_findings IS '実際にあった不具合・状態（ユーザー入力）';
COMMENT ON COLUMN public.bad_cases.focus_points IS '次回以降の解析で重点チェックする項目（例: 隠れたサビ, 塗装の浮き）';

CREATE INDEX IF NOT EXISTS idx_bad_cases_evaluation_id ON public.bad_cases(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_bad_cases_vehicle_id ON public.bad_cases(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bad_cases_created_at ON public.bad_cases(created_at DESC);
