"use client"

import dynamic from "next/dynamic"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

const InvoiceEditor = dynamic(() => import("@/components/invoice-editor"), {
  ssr: false,
  loading: () => <div style={{ color: "#525252", padding: 40, textAlign: "center" }}>読み込み中...</div>,
})

const C = {
  surface: "#111111",
  surfaceHover: "#1a1a1a",
  border: "#2a2a2a",
  orange: "#f97316",
  orangeGlow: "rgba(249,115,22,0.12)",
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
  font: "'DM Mono', 'Courier New', monospace",
}

type InvoiceRow = {
  id: string
  invoice_type: "invoice" | "quote"
  issue_date: string
  client_name: string
  client_address: string
  subject: string
  bank_info: string
  tax_rate: number
  notes: string
  payment_due: string
  items: { id: string; name: string; qty: number; price: number; unit: string }[]
  created_at: string
  updated_at: string
}

type Tab = "list" | "editor"

export default function InvoicesPage() {
  const [tab, setTab] = useState<Tab>("list")
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<InvoiceRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
    setInvoices((data ?? []) as InvoiceRow[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleEdit = (inv: InvoiceRow) => {
    setEditing(inv)
    setTab("editor")
  }

  const handleNew = () => {
    setEditing(null)
    setTab("editor")
  }

  const handleDelete = async (id: string) => {
    if (!confirm("この請求書を削除しますか？")) return
    await supabase.from("invoices").delete().eq("id", id)
    load()
  }

  const handleSaved = () => {
    load()
    setTab("list")
    setEditing(null)
  }

  const fmt = (n: number) => `¥${n.toLocaleString()}`

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ margin: 0, fontFamily: C.fontSans, fontWeight: 800, fontSize: 22, color: C.text, letterSpacing: "-0.02em" }}>
            請求書 / 見積書
          </h1>
          <span style={{ fontFamily: C.font, fontSize: 11, color: C.textMuted, letterSpacing: "0.1em" }}>
            INVOICES
          </span>
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: C.fontSans, fontSize: 13, color: C.textSub }}>
          請求書・見積書の作成・保存・印刷ができます。
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => { setTab("list"); setEditing(null) }}
          style={{
            padding: "8px 20px",
            borderRadius: 6,
            border: `1px solid ${tab === "list" ? C.orange : C.border}`,
            background: tab === "list" ? C.orangeGlow : "transparent",
            color: tab === "list" ? C.orange : C.textSub,
            fontSize: 13,
            fontWeight: tab === "list" ? "bold" : "normal",
            cursor: "pointer",
            fontFamily: C.fontSans,
          }}
        >
          保存済み一覧（{invoices.length}件）
        </button>
        <button
          onClick={handleNew}
          style={{
            padding: "8px 20px",
            borderRadius: 6,
            border: `1px solid ${tab === "editor" && !editing ? C.orange : C.border}`,
            background: tab === "editor" && !editing ? C.orangeGlow : "transparent",
            color: tab === "editor" && !editing ? C.orange : C.textSub,
            fontSize: 13,
            fontWeight: tab === "editor" && !editing ? "bold" : "normal",
            cursor: "pointer",
            fontFamily: C.fontSans,
          }}
        >
          新規作成
        </button>
      </div>

      {/* List tab */}
      {tab === "list" && (
        <div>
          {loading ? (
            <div style={{ color: C.textMuted, fontSize: 13, padding: 40, textAlign: "center" }}>読み込み中...</div>
          ) : invoices.length === 0 ? (
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 48,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
                保存済みの請求書はありません
              </div>
              <button onClick={handleNew} style={{
                padding: "10px 24px",
                borderRadius: 6,
                border: "none",
                background: C.orange,
                color: "#fff",
                fontSize: 13,
                fontWeight: "bold",
                cursor: "pointer",
                fontFamily: C.fontSans,
              }}>
                新規作成
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {invoices.map((inv) => {
                const total = inv.items
                  ? inv.items.reduce((s, it) => s + it.qty * it.price, 0)
                  : 0
                const totalWithTax = total + Math.floor((total * (inv.tax_rate || 0)) / 100)
                return (
                  <div
                    key={inv.id}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                    }}
                    onClick={() => handleEdit(inv)}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.orange + "60")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
                  >
                    {/* Type badge */}
                    <div style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: "bold",
                      fontFamily: C.font,
                      background: inv.invoice_type === "invoice" ? `${C.blue}18` : `${C.green}18`,
                      color: inv.invoice_type === "invoice" ? C.blue : C.green,
                      border: `1px solid ${inv.invoice_type === "invoice" ? C.blue : C.green}30`,
                      whiteSpace: "nowrap",
                    }}>
                      {inv.invoice_type === "invoice" ? "請求書" : "見積書"}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: C.fontSans, fontWeight: 600, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inv.client_name || "（宛先なし）"}
                      </div>
                      <div style={{ fontFamily: C.font, fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                        {inv.subject || "（件名なし）"} / {inv.issue_date}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ fontFamily: C.fontSans, fontWeight: 700, fontSize: 16, color: C.orange }}>
                        {fmt(totalWithTax)}
                      </div>
                      <div style={{ fontFamily: C.font, fontSize: 10, color: C.textMuted }}>
                        {inv.items?.length || 0}品目
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(inv.id) }}
                      style={{
                        padding: "4px 8px",
                        background: "none",
                        border: `1px solid ${C.red}40`,
                        borderRadius: 4,
                        color: C.red,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      削除
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Editor tab */}
      {tab === "editor" && (
        <InvoiceEditor
          key={editing?.id ?? "new"}
          initial={editing ? {
            id: editing.id,
            invoice_type: editing.invoice_type,
            issue_date: editing.issue_date,
            client_name: editing.client_name,
            client_address: editing.client_address,
            subject: editing.subject,
            bank_info: editing.bank_info,
            tax_rate: editing.tax_rate,
            notes: editing.notes,
            payment_due: editing.payment_due,
            items: editing.items,
          } : undefined}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
