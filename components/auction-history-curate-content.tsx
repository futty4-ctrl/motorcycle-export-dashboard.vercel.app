"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  listModelNameGroups,
  renameModelNameBulk,
  type ModelNameGroup,
} from "@/app/actions/auction-history-curate"

const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  border: "#2a2a2a",
  orange: "#f97316",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
  red: "#ef4444",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const fmt = (n: number | null) => (n == null ? "—" : `¥${Math.round(n).toLocaleString()}`)

export default function CurateContent() {
  const [groups, setGroups] = useState<ModelNameGroup[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [targetKey, setTargetKey] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [search, setSearch] = useState("")

  const load = async () => {
    setLoading(true)
    const res = await listModelNameGroups()
    if (res.success) {
      setGroups(res.groups)
      setTotalRecords(res.totalRecords)
    } else {
      toast.error(res.error || "取得失敗")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const selected = groups.find((g) => g.normalized === targetKey) || null

  const handleRename = async () => {
    if (!selected || !newName.trim()) return
    if (!confirm(`${selected.variants.length}パターン・${selected.count}件を「${newName}」に統一します。よろしいですか？`)) {
      return
    }
    setSaving(true)
    const res = await renameModelNameBulk(selected.variants, newName.trim())
    setSaving(false)
    if (res.success) {
      toast.success(`${res.updated}件を更新しました`)
      setTargetKey(null)
      setNewName("")
      load()
    } else {
      toast.error(res.error || "更新失敗")
    }
  }

  const filtered = search
    ? groups.filter(
        (g) =>
          g.normalized.toLowerCase().includes(search.toLowerCase()) ||
          g.variants.some((v) => v.toLowerCase().includes(search.toLowerCase()))
      )
    : groups

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, fontFamily: C.font, color: C.text }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/auction-history" style={{ color: C.textSub, textDecoration: "none", fontSize: 12 }}>
          ← オークション履歴に戻る
        </Link>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
          <h1
            style={{
              fontFamily: C.fontSans,
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            🧹 データ整形（車種名の表記ゆれ統一）
          </h1>
          <span style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.1em" }}>CURATE</span>
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: C.fontSans, fontSize: 13, color: C.textSub }}>
          全 {totalRecords}件 / {groups.length}グループ。
          同じ車種の表記ゆれ（「CB400SF」「CB400 SF」「CB400 スーパーフォア」等）を統一して、仕入ボーダーの相場精度を上げる。
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: Groups list */}
        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="車種名で検索..."
            style={{
              width: "100%",
              padding: "10px 14px",
              background: C.surfaceHigh,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.text,
              fontFamily: C.fontSans,
              fontSize: 13,
              marginBottom: 12,
              outline: "none",
            }}
          />
          {loading ? (
            <div style={{ color: C.textMuted }}>読み込み中...</div>
          ) : (
            <div style={{ maxHeight: "70vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {filtered.map((g) => (
                <button
                  key={g.normalized}
                  onClick={() => {
                    setTargetKey(g.normalized)
                    setNewName(g.variants[0] || "")
                  }}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    background: targetKey === g.normalized ? `${C.orange}15` : C.surface,
                    border: `1px solid ${targetKey === g.normalized ? C.orange : C.border}`,
                    borderRadius: 6,
                    color: C.text,
                    cursor: "pointer",
                    fontFamily: C.fontSans,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {g.variants[0]}
                      {g.variants.length > 1 && (
                        <span style={{ color: C.yellow, fontSize: 11, marginLeft: 6 }}>
                          +{g.variants.length - 1}パターン
                        </span>
                      )}
                    </span>
                    <span style={{ color: C.textSub, fontSize: 11, fontFamily: C.font }}>
                      {g.count}件 / 落札{g.soldCount}件
                    </span>
                  </div>
                  {g.avgSoldPrice != null && (
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4, fontFamily: C.font }}>
                      平均落札: {fmt(g.avgSoldPrice)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail & rename */}
        <div>
          {selected ? (
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 20,
              }}
            >
              <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
                統一対象
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {[
                  { label: "グループ件数", value: `${selected.count}件` },
                  { label: "落札済", value: `${selected.soldCount}件` },
                  { label: "平均落札", value: fmt(selected.avgSoldPrice) },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: C.surfaceHigh,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 14, color: C.orange }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
                含まれる表記（{selected.variants.length}パターン）
              </div>
              <div
                style={{
                  background: C.surfaceHigh,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 20,
                  maxHeight: 200,
                  overflowY: "auto",
                  fontSize: 12,
                  fontFamily: "monospace",
                  lineHeight: 1.8,
                  color: C.textSub,
                }}
              >
                {selected.variants.map((v) => (
                  <div key={v}>・{v}</div>
                ))}
              </div>

              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>
                統一後の車種名
              </div>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="統一後の表記（例: CB400SF）"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: C.surfaceHigh,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.text,
                  fontFamily: C.fontSans,
                  fontSize: 13,
                  marginBottom: 12,
                  outline: "none",
                }}
              />
              <button
                onClick={handleRename}
                disabled={saving || !newName.trim()}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: saving ? C.textMuted : C.orange,
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontFamily: C.fontSans,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "更新中..." : `${selected.variants.length}パターン・${selected.count}件を「${newName || "..."}」に統一`}
              </button>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10, lineHeight: 1.6 }}>
                ※ auction_historyテーブルの model_name を一括置換します。取り消し不可なので慎重に。
              </div>
            </div>
          ) : (
            <div
              style={{
                background: C.surface,
                border: `1px dashed ${C.border}`,
                borderRadius: 10,
                padding: 40,
                textAlign: "center",
                color: C.textMuted,
                fontSize: 13,
              }}
            >
              左の一覧から車種グループを選択してください。
              <br />
              表記ゆれが多いグループ（「+Nパターン」表示）が整形候補。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
