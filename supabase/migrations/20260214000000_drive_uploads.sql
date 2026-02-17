-- Google Drive にアップロードしたファイルのURLを保存するテーブル
CREATE TABLE IF NOT EXISTS public.drive_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  drive_folder_id TEXT,
  drive_folder_url TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.drive_uploads IS 'Drive にアップロードしたファイルのURL・メタデータ';
COMMENT ON COLUMN public.drive_uploads.file_url IS 'Drive のファイル表示URL (webViewLink)';
COMMENT ON COLUMN public.drive_uploads.drive_folder_id IS '保存先フォルダの Drive フォルダID';
COMMENT ON COLUMN public.drive_uploads.vehicle_id IS '紐づく車両（任意）';

CREATE INDEX IF NOT EXISTS idx_drive_uploads_vehicle_id ON public.drive_uploads(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_drive_uploads_created_at ON public.drive_uploads(created_at DESC);
