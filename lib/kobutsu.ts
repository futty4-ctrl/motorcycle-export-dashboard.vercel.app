"use client"

import { supabase } from './supabase'
import type { KobutsuEntry, KobutsuSettings } from '@/types/kobutsu'

// ========== 台帳エントリ ==========

// 全件取得（新しい順）
export async function getEntries() {
  const { data, error } = await supabase
    .from('kobutsu_ledger')
    .select('*')
    .order('transaction_date', { ascending: false })
  return { data: data as KobutsuEntry[] | null, error }
}

// 1件取得
export async function getEntry(id: string) {
  const { data, error } = await supabase
    .from('kobutsu_ledger')
    .select('*')
    .eq('id', id)
    .single()
  return { data: data as KobutsuEntry | null, error }
}

// 新規登録
export async function createEntry(entry: Partial<KobutsuEntry>) {
  const { data, error } = await supabase
    .from('kobutsu_ledger')
    .insert(entry)
    .select()
    .single()
  return { data: data as KobutsuEntry | null, error }
}

// 更新
export async function updateEntry(id: string, entry: Partial<KobutsuEntry>) {
  const { data, error } = await supabase
    .from('kobutsu_ledger')
    .update(entry)
    .eq('id', id)
    .select()
    .single()
  return { data: data as KobutsuEntry | null, error }
}

// 削除
export async function deleteEntry(id: string) {
  const { error } = await supabase
    .from('kobutsu_ledger')
    .delete()
    .eq('id', id)
  return { error }
}

// 検索
export async function searchEntries(term: string) {
  const { data, error } = await supabase
    .from('kobutsu_ledger')
    .select('*')
    .or(`maker.ilike.%${term}%,model.ilike.%${term}%,frame_no.ilike.%${term}%,counterparty_name.ilike.%${term}%`)
    .order('transaction_date', { ascending: false })
  return { data: data as KobutsuEntry[] | null, error }
}

// 販売証明書発行済みに更新
export async function markCertIssued(id: string) {
  const { data, error } = await supabase
    .from('kobutsu_ledger')
    .update({ cert_issued: true, cert_issued_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data: data as KobutsuEntry | null, error }
}

// ========== 設定 ==========

// 設定取得（1レコードのみ）
export async function getSettings() {
  const { data, error } = await supabase
    .from('kobutsu_settings')
    .select('*')
    .limit(1)
    .single()
  return { data: data as KobutsuSettings | null, error }
}

// 設定更新（upsert）
export async function saveSettings(id: string | null, settings: Partial<KobutsuSettings>) {
  if (id) {
    const { data, error } = await supabase
      .from('kobutsu_settings')
      .update(settings)
      .eq('id', id)
      .select()
      .single()
    return { data: data as KobutsuSettings | null, error }
  } else {
    const { data, error } = await supabase
      .from('kobutsu_settings')
      .insert(settings)
      .select()
      .single()
    return { data: data as KobutsuSettings | null, error }
  }
}

// 許可証画像アップロード
export async function uploadLicenseImage(file: File) {
  const ext = file.name.split('.').pop()
  const path = `license-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('kobutsu-license')
    .upload(path, file, { upsert: true })
  if (error) return { url: null, error }

  const { data: urlData } = supabase.storage
    .from('kobutsu-license')
    .getPublicUrl(path)
  return { url: urlData.publicUrl, error: null }
}

// 許可証画像の署名付きURL取得（バケットがprivateの場合）
export async function getLicenseImageUrl(path: string) {
  // publicUrlを試す、ダメならsigned URLにフォールバック
  const { data } = supabase.storage
    .from('kobutsu-license')
    .getPublicUrl(path)
  return data.publicUrl
}
