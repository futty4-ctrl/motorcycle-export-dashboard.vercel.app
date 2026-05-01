"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import {
  fetchBikeTypeCodes,
  upsertBikeTypeCode,
  deleteBikeTypeCode,
  bulkSuggestFromAuctionHistory,
  type BikeTypeCodeRow,
} from "@/lib/bike-type-codes-supabase"
import {
  C,
  font,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  lbl,
  inp,
  btn,
  badge,
  table,
  th,
  td,
} from "@/components/ui-system"

const MAKERS = ["ホンダ", "ヤマハ", "スズキ", "カワサキ", "その他"] as const
const CC_OPTIONS = [50, 80, 90, 100, 110, 125, 150, 250, 400, 750, 1000]

type Suggestion = {
  type_code: string
  maker: string
  model: string
  cc: number
  sample_count: number
}

export function BikeTypesAdminContent() {
  const [rows, setRows] = useState<BikeTypeCodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [makerFilter, setMakerFilter] = useState("")

  const [editing, setEditing] = useState<BikeTypeCodeRow | null>(null)
  const emptyForm = { type_code: "", maker: "", model: "", cc: 125, notes: "" }
  const [form, setForm] = useState<{
    type_code: string
    maker: string
    model: string
    cc: number
    notes: string
  }>(emptyForm)

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await fetchBikeTypeCodes()
    if (error) toast.error(error.message)
    setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return rows.filter((r) => {
      if (makerFilter && r.maker !== makerFilter) return false
      if (!kw) return true
      return (
        r.type_code.toLowerCase().includes(kw) ||
        r.maker.toLowerCase().includes(kw) ||
        r.model.toLowerCase().includes(kw)
      )
    })
  }, [rows, keyword, makerFilter])

  const startEdit = (row: BikeTypeCodeRow) => {
    setEditing(row)
    setForm({
      type_code: row.type_code,
      maker: row.maker,
      model: row.model,
      cc: row.cc,
      notes: row.notes ?? "",
    })
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  const handleSave = async () => {
    if (!form.type_code.trim() || !form.maker.trim() || !form.model.trim()) {
      toast.error("型式・メーカー・車種は必須")
      return
    }
    setSaving(true)
    const { error } = await upsertBikeTypeCode({
      type_code: form.type_code,
      maker: form.maker,
      model: form.model,
      cc: form.cc,
      notes: form.notes || null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(editing ? "更新しました" : "登録しました")
    cancelEdit()
    void load()
  }

  const handleDelete = async (row: BikeTypeCodeRow) => {
    if (!confirm(`${row.type_code} を削除しますか？`)) return
    const { error } = await deleteBikeTypeCode(row.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("削除しました")
    void load()
  }

  const loadSuggestions = async () => {
    setSuggestLoading(true)
    const { candidates, error } = await bulkSuggestFromAuctionHistory()
    setSuggestLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSuggestions(candidates)
    if (candidates.length === 0) {
      toast.info("未登録の型式は見つかりませんでした")
    } else {
      toast.success(`${candidates.length}件の候補`)
    }
  }

  const adoptSuggestion = (s: Suggestion) => {
    setEditing(null)
    setForm({
      type_code: s.type_code,
      maker: s.maker,
      model: s.model,
      cc: s.cc || 125,
      notes: `auction_history から自動抽出（${s.sample_count}件）`,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div style={pageWrapper}>
      <div style={pageTitle}>型式マスター</div>
      <div style={pageSub}>
        型式コードの登録・編集。auction_history から未登録分を自動抽出可能。
      </div>

      <div style={card()}>
        <div style={{ ...lbl, marginBottom: 12 }}>
          {editing ? `編集: ${editing.type_code}` : "新規登録"}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 120px",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div style={lbl}>型式コード</div>
            <input
              style={inp}
              value={form.type_code}
              onChange={(e) =>
                setForm({ ...form, type_code: e.target.value.toUpperCase() })
              }
              placeholder="SE44J"
            />
          </div>
          <div>
            <div style={lbl}>メーカー</div>
            <select
              style={inp}
              value={form.maker}
              onChange={(e) => setForm({ ...form, maker: e.target.value })}
            >
              <option value="">選択</option>
              {MAKERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={lbl}>車種名</div>
            <input
              style={inp}
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="シグナスX"
            />
          </div>
          <div>
            <div style={lbl}>排気量</div>
            <select
              style={inp}
              value={form.cc}
              onChange={(e) =>
                setForm({ ...form, cc: parseInt(e.target.value) || 125 })
              }
            >
              {CC_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}cc
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={lbl}>メモ</div>
          <input
            style={inp}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="任意"
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={btn("primary")}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "保存中…" : editing ? "更新" : "追加"}
          </button>
          {editing && (
            <button style={btn("ghost")} onClick={cancelEdit}>
              キャンセル
            </button>
          )}
        </div>
      </div>

      <div style={card()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={lbl}>未登録候補（auction_history から）</div>
          <button
            style={btn("ghost")}
            disabled={suggestLoading}
            onClick={loadSuggestions}
          >
            {suggestLoading ? "抽出中…" : "候補を抽出"}
          </button>
        </div>
        {suggestions.length > 0 && (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>型式</th>
                <th style={th}>メーカー</th>
                <th style={th}>車種</th>
                <th style={th}>cc</th>
                <th style={th}>件数</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {suggestions.slice(0, 30).map((s) => (
                <tr key={s.type_code}>
                  <td style={td}>
                    <span style={{ fontFamily: font, fontWeight: "bold" }}>
                      {s.type_code}
                    </span>
                  </td>
                  <td style={td}>{s.maker}</td>
                  <td style={td}>{s.model}</td>
                  <td style={td}>{s.cc || "—"}</td>
                  <td style={td}>
                    <span style={badge(C.blue)}>{s.sample_count}</span>
                  </td>
                  <td style={td}>
                    <button
                      style={btn("ghost")}
                      onClick={() => adoptSuggestion(s)}
                    >
                      フォームに展開
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={card()}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 200px",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <input
            style={inp}
            placeholder="型式・車種・メーカーで検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select
            style={inp}
            value={makerFilter}
            onChange={(e) => setMakerFilter(e.target.value)}
          >
            <option value="">全メーカー</option>
            {MAKERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div style={{ ...lbl, marginBottom: 8 }}>
          登録済み: {filtered.length} / {rows.length}件
        </div>
        {loading ? (
          <div style={{ color: C.textMuted, padding: 20 }}>読み込み中…</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>型式</th>
                  <th style={th}>メーカー</th>
                  <th style={th}>車種</th>
                  <th style={th}>cc</th>
                  <th style={th}>メモ</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>
                      <span style={{ fontFamily: font, fontWeight: "bold" }}>
                        {r.type_code}
                      </span>
                    </td>
                    <td style={td}>{r.maker}</td>
                    <td style={td}>{r.model}</td>
                    <td style={td}>{r.cc}</td>
                    <td style={{ ...td, color: C.textMuted, fontSize: 11 }}>
                      {r.notes ?? ""}
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          style={btn("ghost")}
                          onClick={() => startEdit(r)}
                        >
                          編集
                        </button>
                        <button
                          style={btn("danger")}
                          onClick={() => handleDelete(r)}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
