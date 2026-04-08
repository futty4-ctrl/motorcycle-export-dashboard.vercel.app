"use client"

import { supabase } from './supabase'
import type { DocumentRecord, IssuerPreset } from '@/types/document'

// ========== Documents ==========

// 全件取得（新しい順）
export async function getDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('doc_date', { ascending: false })
  return { data: data as DocumentRecord[] | null, error }
}

// 1件取得
export async function getDocument(id: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()
  return { data: data as DocumentRecord | null, error }
}

// 新規登録
export async function createDocument(doc: Partial<DocumentRecord>) {
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single()
  return { data: data as DocumentRecord | null, error }
}

// 削除
export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
  return { error }
}

// 検索
export async function searchDocuments(term: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .or(`client_name.ilike.%${term}%,doc_number.ilike.%${term}%`)
    .order('doc_date', { ascending: false })
  return { data: data as DocumentRecord[] | null, error }
}

// ========== Issuer Presets ==========

// 全件取得
export async function getIssuerPresets() {
  const { data, error } = await supabase
    .from('issuer_presets')
    .select('*')
    .order('id')
  return { data: data as IssuerPreset[] | null, error }
}

// 1件取得
export async function getIssuerPreset(id: string) {
  const { data, error } = await supabase
    .from('issuer_presets')
    .select('*')
    .eq('id', id)
    .single()
  return { data: data as IssuerPreset | null, error }
}

// 更新
export async function updateIssuerPreset(id: string, preset: Partial<IssuerPreset>) {
  const { data, error } = await supabase
    .from('issuer_presets')
    .update(preset)
    .eq('id', id)
    .select()
    .single()
  return { data: data as IssuerPreset | null, error }
}
