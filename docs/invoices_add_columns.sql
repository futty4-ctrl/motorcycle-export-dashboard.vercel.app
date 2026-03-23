-- invoicesテーブルに新カラムを追加
-- Supabase SQL Editor で実行してください

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS client_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_due    TEXT DEFAULT '';
