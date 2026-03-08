-- Phase 2: 現地メモ・売主情報
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS onsite_notes TEXT,
  ADD COLUMN IF NOT EXISTS seller_info TEXT;

COMMENT ON COLUMN public.vehicles.onsite_notes IS '現地での自由メモ・所見';
COMMENT ON COLUMN public.vehicles.seller_info IS '売主からのヒアリング情報（条件など）';
